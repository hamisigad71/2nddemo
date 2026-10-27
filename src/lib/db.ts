import { supabase } from "./supabase";
import { FALLBACK_POSTS } from "../data/mockPosts";
import { getEscorts } from "./mockData";
import {
  resolveUserAvatar,
  getDefaultAvatar,
  compressAvatarImage,
  hasUploadedProfilePhoto,
  hasUploadedCoverPhoto,
} from "./avatar";
import { fetchAllPages } from "./pagination";
import {
  addLocalCreatorCandidates,
  resolveCreatorDisplayName,
  GENERIC_CREATOR_NAMES,
  isSelectedVerifiedCreator,
  isUnverifiedDiscoverUser,
} from "./creatorDirectory";
import {
  hasPrivateKycEvidence,
  isKycVerified,
  isCreatorVerified,
  resolveCreatorVerificationPayloads,
} from "./verification";
import { calculateAge, getPublicGenderLabel } from "./profileDemographics";
import { getCreatorPayoutAmountError } from "./creatorPayoutRules";
import {
  buildCreatorSubscriptionMessage,
  buildTransactionPaymentNotification,
  getPaymentMethodLabel,
} from "./paymentNotifications";

export const PLATFORM_FEE = 0.3;

export const calculateFeeSplit = (
  grossAmount: number,
  feeRate: number = PLATFORM_FEE,
): { platformFee: number; creatorNet: number } => {
  if (!grossAmount || grossAmount <= 0) {
    return { platformFee: 0, creatorNet: 0 };
  }
  const platformFee = Math.round(grossAmount * feeRate);
  const creatorNet = Math.max(0, grossAmount - platformFee);
  return { platformFee, creatorNet };
};

// ========================
// 1. USERS
// ========================

export const createUserProfile = async (uid: string, data: any) => {
  const initialAvatar = data.avatar || getDefaultAvatar(data.name);

  // Check by uid first (same auth session)
  const { data: byUid } = await supabase
    .from("users")
    .select("uid, role, created_at")
    .eq("uid", uid)
    .maybeSingle();
  if (byUid) {
    // If role was explicitly specified (e.g. 'creator' or 'subscriber') and differs from existing role, update it
    if (data.role && data.role !== byUid.role) {
      await supabase.from("users").update({ role: data.role }).eq("uid", uid);
      byUid.role = data.role;
    }
    const userUpdates: Record<string, any> = {
      ...(data.name ? { name: data.name } : {}),
      ...(data.avatar ? { avatar: data.avatar } : {}),
      ...(data.phone ? { phone: data.phone } : {}),
      ...(data.gender !== undefined ? { gender: data.gender } : {}),
      ...(data.gender_description !== undefined
        ? { gender_description: data.gender_description }
        : {}),
      ...(data.legal_name ? { legal_name: data.legal_name } : {}),
      ...(data.national_id_number
        ? { national_id_number: data.national_id_number }
        : {}),
      ...(data.dob ? { dob: data.dob } : {}),
      ...(data.kyc_id_url ? { kyc_id_url: data.kyc_id_url } : {}),
      ...(data.kyc_selfie_url ? { kyc_selfie_url: data.kyc_selfie_url } : {}),
      ...(data.kyc_status &&
      ["unverified", "pending", "verified", "rejected"].includes(
        data.kyc_status,
      )
        ? { kyc_status: data.kyc_status }
        : {}),
    };
    if (Object.keys(userUpdates).length > 0) {
      const { error: updErr } = await supabase
        .from("users")
        .update(userUpdates)
        .eq("uid", uid);
      if (
        updErr &&
        (data.gender !== undefined || data.gender_description !== undefined)
      )
        throw updErr;
      if (
        updErr &&
        (updErr.message?.includes("column") ||
          updErr.code === "42703" ||
          updErr.code === "PGRST204")
      ) {
        const coreUpdates: Record<string, any> = {
          ...(data.name ? { name: data.name } : {}),
          ...(data.avatar ? { avatar: data.avatar } : {}),
          ...(data.phone ? { phone: data.phone } : {}),
        };
        if (Object.keys(coreUpdates).length > 0) {
          await supabase.from("users").update(coreUpdates).eq("uid", uid);
        }
      }
    }

    if (data.role === "creator") {
      try {
        const { error } = await supabase.from("creator_profiles").upsert(
          {
            user_id: uid,
            display_name: data.name,
            ...(data.gender !== undefined ? { gender: data.gender } : {}),
            ...(data.gender_description !== undefined
              ? { gender_description: data.gender_description }
              : {}),
            ...(data.dob !== undefined && data.dob !== null
              ? { dob: data.dob }
              : {}),
            avatar: data.avatar || initialAvatar,
            avatar_url: data.avatar || initialAvatar,
            bio: "Welcome to my official creator page! Exclusive posts, videos, and private chats.",
            monthly_price: 1000,
            location: "Nairobi, Kenya",
            cover_image: data.cover_image || "/default-cover.jpg",
            tags: ["VIP Content", "Direct Chat", "Exclusive Photos"],
          },
          { onConflict: "user_id" },
        );
        if (
          error &&
          (data.gender !== undefined || data.gender_description !== undefined)
        )
          throw error;
      } catch (error) {
        if (data.gender !== undefined || data.gender_description !== undefined)
          throw error;
        // non-fatal if table not configured
      }

      // Announce only once, and only for verified creators created in the last 24h
      const flagKey = `tgd_new_creator_notified_${uid}`;
      const createdAt = byUid.created_at
        ? new Date(byUid.created_at).getTime()
        : 0;
      const isFresh = Date.now() - createdAt < 24 * 60 * 60 * 1000;
      const alreadyNotified =
        typeof window !== "undefined" && localStorage.getItem(flagKey);
      if (
        isFresh &&
        !alreadyNotified &&
        (data.is_verified || data.kyc_status === "verified")
      ) {
        if (typeof window !== "undefined") localStorage.setItem(flagKey, "1");
        notifySubscribersOfNewCreator(
          uid,
          data.name || "New Creator",
          data.avatar,
        ).catch((err) => {
          console.warn("Could not dispatch new creator notification:", err);
        });
      }
    }
    return;
  }

  // Also check by email — prevents duplicate rows when the same person
  // signs up via different auth providers (e.g., Google then email/password)
  if (data.email) {
    const { data: byEmail } = await supabase
      .from("users")
      .select("uid, role")
      .eq("email", data.email)
      .maybeSingle();
    if (byEmail) {
      if (data.role && data.role !== byEmail.role) {
        await supabase
          .from("users")
          .update({ role: data.role })
          .eq("uid", byEmail.uid);
      }
      return; // Email already has a profile — skip creating duplicate row
    }
  }

  const insertPayload: Record<string, any> = {
    uid,
    name: data.name,
    email: data.email,
    avatar: initialAvatar,
    phone: data.phone,
    role: data.role || "subscriber",
    ...(data.gender !== undefined ? { gender: data.gender } : {}),
    ...(data.gender_description !== undefined
      ? { gender_description: data.gender_description }
      : {}),
    ...(data.legal_name ? { legal_name: data.legal_name } : {}),
    ...(data.national_id_number
      ? { national_id_number: data.national_id_number }
      : {}),
    ...(data.dob ? { dob: data.dob } : {}),
    ...(data.kyc_id_url ? { kyc_id_url: data.kyc_id_url } : {}),
    ...(data.kyc_selfie_url ? { kyc_selfie_url: data.kyc_selfie_url } : {}),
    ...(data.kyc_status &&
    ["unverified", "pending", "verified", "rejected"].includes(data.kyc_status)
      ? { kyc_status: data.kyc_status }
      : {}),
  };

  await supabase
    .from("users")
    .insert(insertPayload)
    .then(async ({ error }) => {
      if (
        error &&
        (error.message?.includes("column") ||
          error.code === "42703" ||
          error.code === "PGRST204")
      ) {
        if (
          data.gender !== undefined ||
          data.gender_description !== undefined
        ) {
          throw new Error(
            "Profile demographics could not be saved. Apply the profile demographics database migration and try again.",
          );
        }
        await supabase.from("users").insert({
          uid,
          name: data.name,
          email: data.email,
          avatar: initialAvatar,
          phone: data.phone,
          role: data.role || "subscriber",
        });
      } else if (error && error.code !== "23505") {
        if (data.gender !== undefined || data.gender_description !== undefined)
          throw error;
        console.error("createUserProfile: users insert failed:", error.message);
      }
    });

  if (data.role === "creator") {
    try {
      const { error } = await supabase.from("creator_profiles").upsert(
        {
          user_id: uid,
          display_name: data.name,
          ...(data.gender !== undefined ? { gender: data.gender } : {}),
          ...(data.gender_description !== undefined
            ? { gender_description: data.gender_description }
            : {}),
          ...(data.dob !== undefined && data.dob !== null
            ? { dob: data.dob }
            : {}),
          avatar: data.avatar || initialAvatar,
          avatar_url: data.avatar || initialAvatar,
          bio: "Welcome to my official creator page! Exclusive posts, videos, and private chats.",
          monthly_price: 1000,
          location: "Nairobi, Kenya",
          cover_image: data.cover_image || "/default-cover.jpg",
          tags: ["VIP Content", "Direct Chat", "Exclusive Photos"],
        },
        { onConflict: "user_id" },
      );
      if (
        error &&
        (data.gender !== undefined || data.gender_description !== undefined)
      )
        throw error;
    } catch (error) {
      if (data.gender !== undefined || data.gender_description !== undefined)
        throw error;
      // non-fatal
    }

    if (data.is_verified || data.kyc_status === "verified") {
      notifySubscribersOfNewCreator(
        uid,
        data.name || "New Creator",
        data.avatar,
      ).catch((err) => {
        console.warn("Could not dispatch new creator notification:", err);
      });
    }
  }
};

export const getUserProfile = async (uid: string) => {
  if (!uid) return null;
  const cleanUid = uid.replace(/[^a-zA-Z0-9_-]/g, "");
  try {
    let { data: userRow } = await supabase
      .from("users")
      .select("*")
      .eq("uid", cleanUid)
      .maybeSingle();

    if (!userRow) {
      const { data: userRowById } = await supabase
        .from("users")
        .select("*")
        .eq("id", cleanUid)
        .maybeSingle();
      if (userRowById) userRow = userRowById;
    }

    const currentAvatar = userRow?.avatar || userRow?.avatar_url;

    // If user's avatar is missing in users table, check creator_profiles
    if (!currentAvatar) {
      const { data: creatorMeta } = await supabase
        .from("creator_profiles")
        .select("*")
        .eq("user_id", cleanUid)
        .maybeSingle();

      if (creatorMeta) {
        return {
          ...(userRow || {}),
          uid: cleanUid,
          name: userRow?.name || creatorMeta.display_name || "Creator",
          avatar: creatorMeta.avatar_url || creatorMeta.avatar || null,
          bio: userRow?.bio || creatorMeta.bio,
          cover_image: userRow?.cover_image || creatorMeta.cover_image,
        };
      }
    }

    return userRow
      ? {
          ...userRow,
          avatar: currentAvatar || null,
        }
      : null;
  } catch (err) {
    console.warn("getUserProfile error:", err);
    return null;
  }
};

export const isVideoMediaUrl = (url?: string | null): boolean => {
  if (!url || typeof url !== "string") return false;
  return (
    /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url) ||
    url.includes("/videos/") ||
    url.includes("video/")
  );
};

const creatorStorageAssetsCache = new Map<
  string,
  { avatar: string | null; cover: string | null }
>();

export const invalidateCreatorStorageAssets = (creatorId: string) => {
  if (creatorId) creatorStorageAssetsCache.delete(creatorId);
};

export const getCreatorStorageAssets = async (
  creatorId: string,
): Promise<{ avatar: string | null; cover: string | null }> => {
  if (
    !creatorId ||
    creatorId.startsWith("escort-") ||
    creatorId.startsWith("creator-")
  ) {
    return { avatar: null, cover: null };
  }

  const cached = creatorStorageAssetsCache.get(creatorId);
  if (cached) return cached;

  let avatar: string | null = null;
  let cover: string | null = null;

  const storageBuckets = ["Daysman Gad", "avatars", "media"];
  const avatarPrefixes = [`avatars/${creatorId}`, `avatars/users/${creatorId}`];

  for (const bucket of storageBuckets) {
    if (avatar) break;
    for (const prefix of avatarPrefixes) {
      if (avatar) break;
      try {
        const { data: avFiles } = await supabase.storage
          .from(bucket)
          .list(prefix, {
            limit: 10,
            sortBy: { column: "name", order: "desc" },
          });

        if (avFiles && avFiles.length > 0) {
          const validFile = avFiles.find(
            (f) =>
              f.name &&
              !f.name.startsWith(".") &&
              !f.name.includes("emptyFolderPlaceholder"),
          );
          if (validFile) {
            const { data } = supabase.storage
              .from(bucket)
              .getPublicUrl(`${prefix}/${validFile.name}`);
            if (data?.publicUrl) avatar = data.publicUrl;
          }
        }
      } catch {}
    }
  }

  for (const bucket of storageBuckets) {
    if (cover) break;
    try {
      // 1. Check folder covers/${creatorId}
      const { data: covFiles } = await supabase.storage
        .from(bucket)
        .list(`covers/${creatorId}`, {
          limit: 10,
          sortBy: { column: "name", order: "desc" },
        });

      if (covFiles && covFiles.length > 0) {
        const validFile = covFiles.find(
          (f) =>
            f.name &&
            !f.name.startsWith(".") &&
            !f.name.includes("emptyFolderPlaceholder"),
        );
        if (validFile) {
          const { data } = supabase.storage
            .from(bucket)
            .getPublicUrl(`covers/${creatorId}/${validFile.name}`);
          if (data?.publicUrl) cover = data.publicUrl;
        }
      }
    } catch {}

    // 2. Also check flat covers/ directory for files named with creatorId prefix (e.g. login/signup uploads)
    if (!cover) {
      try {
        const { data: flatCovers } = await supabase.storage
          .from(bucket)
          .list("covers", {
            search: creatorId,
            limit: 10,
            sortBy: { column: "created_at", order: "desc" },
          });

        if (flatCovers && flatCovers.length > 0) {
          const validFlat = flatCovers.find(
            (f) =>
              f.name &&
              f.name.startsWith(creatorId) &&
              !f.name.startsWith(".") &&
              !f.name.includes("emptyFolderPlaceholder"),
          );
          if (validFlat) {
            const { data } = supabase.storage
              .from(bucket)
              .getPublicUrl(`covers/${validFlat.name}`);
            if (data?.publicUrl) cover = data.publicUrl;
          }
        }
      } catch {}
    }
  }

  const result = { avatar, cover };
  if (avatar || cover) {
    creatorStorageAssetsCache.set(creatorId, result);
  }
  return result;
};

export const updateUserProfile = async (uid: string, data: any) => {
  if (!uid) return;
  const cleanUid = uid.replace(/[^a-zA-Z0-9_-]/g, "");
  const synchronizedData = {
    ...data,
    ...(data.avatar && !data.avatar_url ? { avatar_url: data.avatar } : {}),
    ...(data.avatar_url && !data.avatar ? { avatar: data.avatar_url } : {}),
  };
  try {
    // 1. Try update on users table
    const { data: updatedRows, error } = await supabase
      .from("users")
      .update(synchronizedData)
      .eq("uid", cleanUid)
      .select("uid");

    // If no row was updated (e.g. user row does not exist yet in users table), upsert it!
    if (!error && (!updatedRows || updatedRows.length === 0)) {
      const { error: upsertErr } = await supabase
        .from("users")
        .upsert({ uid: cleanUid, ...synchronizedData }, { onConflict: "uid" });
      if (upsertErr) {
        console.warn("users upsert note:", upsertErr.message);
      }
      return;
    }

    if (!error) return;

    // If some columns like 'bio' or 'cover_image' are not in 'users' table yet, retry with safe core columns
    if (
      error.message?.includes("column") ||
      error.code === "42703" ||
      error.code === "PGRST204"
    ) {
      const safeData: any = {};
      if (data.name !== undefined) safeData.name = data.name;
      if (data.avatar !== undefined || data.avatar_url !== undefined) {
        safeData.avatar = data.avatar || data.avatar_url;
        safeData.avatar_url = data.avatar_url || data.avatar;
      }
      if (data.cover_image !== undefined)
        safeData.cover_image = data.cover_image;
      if (data.phone !== undefined) safeData.phone = data.phone;
      if (data.role !== undefined) safeData.role = data.role;
      if (data.email !== undefined) safeData.email = data.email;

      const { data: retryRows, error: retryError } = await supabase
        .from("users")
        .update(safeData)
        .eq("uid", cleanUid)
        .select("uid");

      if (!retryError && (!retryRows || retryRows.length === 0)) {
        await supabase
          .from("users")
          .upsert({ uid: cleanUid, ...safeData }, { onConflict: "uid" });
      }
      if (retryError) {
        console.warn("Retry updating user profile notice:", retryError.message);
      }
    } else {
      console.warn("updateUserProfile notice:", error.message);
    }
  } catch (err: any) {
    console.warn("updateUserProfile exception:", err?.message || err);
  }
};

export const updateProfileDemographics = async (
  uid: string,
  data: {
    dob?: string;
    gender?: string | null;
    gender_description?: string | null;
  },
  creatorName?: string,
) => {
  if (!uid)
    throw new Error("A signed-in account is required to save profile details.");
  if (!Object.keys(data).length)
    throw new Error("At least one profile detail is required.");

  const { data: updatedUser, error: userError } = await supabase
    .from("users")
    .update(data)
    .eq("uid", uid)
    .select("uid")
    .maybeSingle();

  if (userError) {
    if (
      userError.message?.includes("column") ||
      userError.code === "42703" ||
      userError.code === "PGRST204"
    ) {
      throw new Error(
        "Profile details could not be saved. Apply the profile demographics database migration and try again.",
      );
    }
    throw userError;
  }
  if (!updatedUser)
    throw new Error(
      "Your account profile was not found. Please sign in again and retry.",
    );

  if (creatorName !== undefined) {
    const { error: creatorError } = await supabase
      .from("creator_profiles")
      .upsert(
        {
          user_id: uid,
          display_name: creatorName,
          ...data,
        },
        { onConflict: "user_id" },
      );
    if (creatorError) {
      if (
        creatorError.message?.includes("column") ||
        creatorError.code === "42703" ||
        creatorError.code === "PGRST204"
      ) {
        throw new Error(
          "Creator details could not be saved. Apply the profile demographics database migration and try again.",
        );
      }
      throw creatorError;
    }
  }
};

export const updateCreatorProfile = async (uid: string, data: any) => {
  try {
    const { error } = await supabase.from("creator_profiles").upsert(
      {
        user_id: uid,
        ...data,
      },
      { onConflict: "user_id" },
    );
    if (error) {
      console.warn("creator_profiles upsert notice:", error.message);
    }
  } catch (err) {
    console.error("Error updating creator profile:", err);
  }
};

export const deleteUserAccount = async (uid: string): Promise<boolean> => {
  if (!uid) return false;

  const cleanUid = uid.trim();

  // OWASP A01 Access Control: Verify caller is account owner or admin
  let isAdmin = false;
  let isSelf = false;

  // 1. Check verified Admin Portal session (unlocked via Admin security passcode/PIN)
  if (typeof window !== "undefined") {
    try {
      const adminSession = sessionStorage.getItem("tgd_admin_session_auth");
      if (adminSession) {
        const parsed = JSON.parse(adminSession);
        if (
          parsed?.authorized === true &&
          Date.now() - (parsed.timestamp || 0) < 8 * 60 * 60 * 1000
        ) {
          isAdmin = true;
        }
      }
    } catch {}
  }

  try {
    const { data: authData } = await supabase.auth.getUser();
    const caller = authData?.user;
    if (caller) {
      if (caller.id === cleanUid || caller.id === uid) {
        isSelf = true;
      }

      // 2. Check Supabase Auth user_metadata or app_metadata
      if (!isAdmin) {
        if (
          caller.user_metadata?.role === "admin" ||
          caller.app_metadata?.role === "admin" ||
          caller.user_metadata?.is_admin === true ||
          caller.app_metadata?.is_admin === true
        ) {
          isAdmin = true;
        }
      }

      // 3. Email heuristic
      if (!isAdmin && caller.email) {
        const emailLower = caller.email.toLowerCase();
        if (
          emailLower.includes("admin") ||
          emailLower.endsWith("@thegentsdollhouse.com")
        ) {
          isAdmin = true;
        }
      }

      // 4. Database role check in public.users
      if (!isAdmin) {
        try {
          const { data: dbUser } = await supabase
            .from("users")
            .select("role")
            .or(`uid.eq.${caller.id},id.eq.${caller.id}`)
            .maybeSingle();

          if (dbUser?.role === "admin") {
            isAdmin = true;
          }
        } catch (err) {
          console.warn("Caller DB admin check notice:", err);
        }
      }

      // If caller is an admin, ensure their DB profile in public.users has role = 'admin'
      if (isAdmin && caller.id) {
        try {
          await supabase
            .from("users")
            .update({ role: "admin" })
            .or(`uid.eq.${caller.id},id.eq.${caller.id}`);
        } catch {}
      }
    }
  } catch (authErr: any) {
    console.warn("Caller verification note:", authErr);
  }

  if (!isSelf && !isAdmin) {
    throw new Error(
      "Unauthorized: Admin authority or account ownership required to delete account.",
    );
  }

  try {
    // 0. Immediately record deletion locally so UI, Discover, and Admin tables drop creator instantly
    if (typeof window !== "undefined") {
      try {
        const deletedIds = new Set(
          JSON.parse(localStorage.getItem("tgd_deleted_creator_ids") || "[]"),
        );
        deletedIds.add(uid);
        deletedIds.add(cleanUid);
        localStorage.setItem(
          "tgd_deleted_creator_ids",
          JSON.stringify(Array.from(deletedIds)),
        );
      } catch {}

      localStorage.removeItem(`tgd_creator_profile_${cleanUid}`);
      localStorage.removeItem(`tgd_creator_profile_${uid}`);
      localStorage.removeItem(`tgd_fan_subs_${cleanUid}`);
      localStorage.removeItem(`tgd_fan_subs_${uid}`);
      localStorage.removeItem(`tgd_user_status_${cleanUid}`);
      localStorage.removeItem(`tgd_user_status_${uid}`);

      try {
        const cached = JSON.parse(
          localStorage.getItem("tgd_all_posts") || "[]",
        );
        localStorage.setItem(
          "tgd_all_posts",
          JSON.stringify(
            cached.filter(
              (p: any) => p.creator_id !== uid && p.creator_id !== cleanUid,
            ),
          ),
        );
      } catch {}
      try {
        const cachedCreators = JSON.parse(
          localStorage.getItem("tgd_hardcoded_creators") || "[]",
        );
        localStorage.setItem(
          "tgd_hardcoded_creators",
          JSON.stringify(
            cachedCreators.filter(
              (c: any) => c.id !== uid && c.id !== cleanUid,
            ),
          ),
        );
      } catch {}

      window.dispatchEvent(
        new CustomEvent("account_status_changed", {
          detail: { userId: cleanUid, status: "deleted" },
        }),
      );
      window.dispatchEvent(new CustomEvent("creators_updated"));
      window.dispatchEvent(new CustomEvent("posts_updated"));
    }

    // 1. Try server-side RPC function which deletes from auth.users and public tables
    try {
      const { data: rpcSuccess, error: rpcErr } = await supabase.rpc(
        "admin_delete_user",
        { target_uid: cleanUid },
      );
      if (!rpcErr && rpcSuccess) {
        return true;
      }
      if (rpcErr) {
        console.warn(
          "RPC admin_delete_user notice, continuing with fallback cleanup:",
          rpcErr.message,
        );
      }
    } catch (rpcEx) {
      console.warn(
        "RPC admin_delete_user not found or failed, falling back to manual cleanup:",
        rpcEx,
      );
    }

    // 2. Direct database table cleanups
    try {
      await supabase
        .from("escort_applications")
        .delete()
        .or(`creator_id.eq.${cleanUid},user_id.eq.${cleanUid}`);
    } catch {}
    try {
      await supabase
        .from("ad_applications")
        .delete()
        .eq("creator_id", cleanUid);
    } catch {}
    try {
      await supabase
        .from("notifications")
        .delete()
        .or(`user_id.eq.${cleanUid},sender_id.eq.${cleanUid}`);
    } catch {}
    try {
      await supabase.from("post_likes").delete().eq("user_id", cleanUid);
    } catch {}
    try {
      await supabase.from("comments").delete().eq("user_id", cleanUid);
    } catch {}
    try {
      await supabase
        .from("subscriptions")
        .delete()
        .or(`fan_id.eq.${cleanUid},creator_id.eq.${cleanUid}`);
    } catch {}
    try {
      await supabase
        .from("transactions")
        .delete()
        .or(`from_user_id.eq.${cleanUid},to_creator_id.eq.${cleanUid}`);
    } catch {}
    try {
      await supabase
        .from("creator_profiles")
        .delete()
        .or(`user_id.eq.${cleanUid},id.eq.${cleanUid}`);
    } catch {}
    try {
      await supabase.from("posts").delete().eq("creator_id", cleanUid);
    } catch {}
    try {
      await supabase
        .from("messages")
        .delete()
        .or(`sender_id.eq.${cleanUid},receiver_id.eq.${cleanUid}`);
    } catch {}

    // Delete user row from users table
    const { error: delErr } = await supabase
      .from("users")
      .delete()
      .or(`uid.eq.${cleanUid},id.eq.${cleanUid}`);
    if (delErr) {
      // In case RLS restricts row deletion, neutralize and ban the account
      await supabase
        .from("users")
        .update({
          status: "banned",
          role: "suspended_creator",
          name: "[Deleted Account]",
          bio: null,
          avatar: null,
          cover_image: null,
        })
        .or(`uid.eq.${cleanUid},id.eq.${cleanUid}`);
    }

    return true;
  } catch (err) {
    console.warn("Error during deleteUserAccount DB cleanup:", err);
    return false;
  }
};

// ========================
// 2. STORAGE (Photo Uploads)
// ========================

export const uploadFileToSupabase = async (
  file: File,
  bucket: string,
  path: string,
): Promise<string | null> => {
  let fileToUpload = file;
  let compactFallbackDataUrl = "";

  // 1. Optimize & compress avatar/profile images client-side before upload
  if (file.type && file.type.startsWith("image/")) {
    try {
      const isAvatar =
        path.includes("avatars") || path.includes("verification");
      const maxDim = isAvatar ? 512 : 1200;
      const quality = isAvatar ? 0.82 : 0.85;
      const compressed = await compressAvatarImage(file, maxDim, quality);
      fileToUpload = compressed.file;
      compactFallbackDataUrl = compressed.dataUrl;
    } catch (e) {
      console.warn("Avatar pre-compression notice:", e);
    }
  }

  const cleanPath = path.replace(/^\/+/, "").replace(/\s+/g, "_");
  const bucketsToTry = Array.from(
    new Set(
      [bucket, "Daysman Gad", "avatars", "media", "public", "posts"].filter(
        Boolean,
      ),
    ),
  );

  for (const b of bucketsToTry) {
    try {
      const { error } = await supabase.storage
        .from(b)
        .upload(cleanPath, fileToUpload, {
          upsert: true,
          contentType: fileToUpload.type || "image/jpeg",
        });
      if (!error) {
        try {
          const { data: signedData } = await supabase.storage
            .from(b)
            .createSignedUrl(cleanPath, 60 * 60 * 24 * 30);
          if (signedData?.signedUrl) return signedData.signedUrl;
        } catch {}

        const { data } = supabase.storage.from(b).getPublicUrl(cleanPath);
        if (data?.publicUrl) return data.publicUrl;
      } else {
        console.warn(`Storage upload notice (${b}):`, error.message);
      }
    } catch (err: any) {
      if (err?.message?.includes("50MB")) throw err;
      console.warn(`Storage exception (${b}):`, err?.message || err);
    }
  }

  // Resilient fallback: Return compact data URL (< 50KB) guaranteed to save into DB without payload limit errors
  if (compactFallbackDataUrl) return compactFallbackDataUrl;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(fileToUpload);
  });
};

export const uploadPrivatePostMedia = async (
  file: File,
  creatorId: string,
  path: string,
): Promise<string> => {
  const cleanPath = `private/posts/${creatorId}/${path.replace(/^posts\//, "")}`;
  try {
    const { error } = await supabase.storage
      .from("Daysman Gad")
      .upload(cleanPath, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage
        .from("Daysman Gad")
        .getPublicUrl(cleanPath);
      if (data?.publicUrl) return data.publicUrl;
    } else {
      console.warn("Storage upload note:", error.message);
      if (
        (error as any).statusCode === "413" ||
        error.message?.toLowerCase().includes("exceeded the maximum")
      ) {
        throw new Error(
          "Video exceeds Supabase’s maximum upload limit (50MB). Please compress the video under 50MB or upgrade your Supabase storage limit.",
        );
      }
    }
  } catch (err: any) {
    if (err?.message?.includes("50MB")) throw err;
    console.warn("Private media storage exception:", err);
  }

  // Resilient fallback: Convert file to Base64 Data URL so media upload never fails
  const fallbackUrl = await uploadFileToSupabase(
    file,
    "Daysman Gad",
    cleanPath,
  );
  if (fallbackUrl) return fallbackUrl;

  return cleanPath;
};

const resolvePrivatePostMedia = async (
  posts: any[],
  viewerId?: string,
  subscribedCreatorIds?: Set<string>,
) => {
  return Promise.all(
    posts.map(async (post) => {
      // 1. Is viewer the author/creator of this post?
      const isOwner = Boolean(viewerId && viewerId === post.creator_id);

      // 2. Is viewer an active subscriber to this creator?
      const isSubscribed = Boolean(
        viewerId && subscribedCreatorIds?.has(post.creator_id),
      );

      // 3. Is post free and public?
      const isPublicFree = Boolean(
        (post.visibility === "public" || !post.visibility) && !post.is_locked,
      );

      // 4. Access is granted if owner, or if public free, or if subscribed and post is not a separate PPV unlock
      const accessGranted =
        isOwner ||
        isPublicFree ||
        (isSubscribed && post.visibility !== "ppv" && !post.is_locked);

      let mediaUrl = post.media_url;

      // Clean up deprecated or blocked Pinterest CDN links
      if (
        mediaUrl &&
        (mediaUrl.includes("i.pinimg.com") ||
          mediaUrl.includes("pinterest.com"))
      ) {
        mediaUrl =
          "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80";
      }

      // If media is a relative storage path or a Supabase storage URL on a private bucket, create signed URL
      if (
        mediaUrl &&
        !mediaUrl.startsWith("data:") &&
        !mediaUrl.startsWith("blob:")
      ) {
        let storagePath: string | null = null;
        if (!/^https?:\/\//i.test(mediaUrl)) {
          storagePath = mediaUrl;
        } else if (mediaUrl.includes("/storage/v1/object/public/")) {
          const split = mediaUrl.split(
            /\/storage\/v1\/object\/public\/[^/]+\//,
          );
          if (split[1]) storagePath = decodeURIComponent(split[1]);
        }

        if (storagePath) {
          try {
            const { data, error } = await supabase.storage
              .from("Daysman Gad")
              .createSignedUrl(storagePath, 60 * 60 * 24);
            if (!error && data?.signedUrl) {
              mediaUrl = data.signedUrl;
            }
          } catch (err) {
            console.warn("Could not authorize private post media:", err);
          }
        }
      }

      return {
        ...post,
        media_url: mediaUrl,
        media_access_granted: accessGranted,
      };
    }),
  );
};

export const getStoredCreatorProfile = (uid: string) => {
  if (typeof window === "undefined") return null;
  try {
    const direct = localStorage.getItem(`tgd_creator_profile_${uid}`);
    if (direct) return JSON.parse(direct);

    const generic = localStorage.getItem("creator_profile_data");
    if (generic) {
      const parsed = JSON.parse(generic);
      if (parsed.user_id === uid || parsed.uid === uid) return parsed;
    }
  } catch {}
  return null;
};

// ========================
// 3. POSTS (Feed + PPV)
// ========================

export const createPost = async (
  creatorId: string,
  content: string,
  mediaUrl: string | null,
  isLocked: boolean,
  price: number,
  mediaType: "image" | "video" = "image",
  options: {
    visibility?: "public" | "subscribers" | "ppv";
    status?: "published" | "draft";
  } = {},
) => {
  const newPostId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const visibility = options.visibility || (isLocked ? "ppv" : "public");
  const status = options.status || "published";

  // Immediately resolve the creator's current name and avatar
  const localProfile = getStoredCreatorProfile(creatorId);
  let creatorName =
    (localProfile?.name && localProfile.name !== "Creator"
      ? localProfile.name
      : null) ||
    (localProfile?.display_name && localProfile.display_name !== "Creator"
      ? localProfile.display_name
      : null);
  let creatorAvatar = localProfile?.avatar || localProfile?.avatar_url || null;

  // If not resolved from local profile, query full creator profile & auth session
  if (!creatorName || !creatorAvatar) {
    try {
      const fullProfile = await getCreatorProfile(creatorId);
      if (fullProfile) {
        if (
          !creatorName &&
          fullProfile.name &&
          fullProfile.name !== "Creator"
        ) {
          creatorName = fullProfile.name;
        }
        if (!creatorAvatar && fullProfile.avatar) {
          creatorAvatar = fullProfile.avatar;
        }
      }
    } catch {}
  }

  if ((!creatorAvatar || !creatorName) && typeof window !== "undefined") {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("sb-") || key.includes("auth-token"))) {
          const item = JSON.parse(localStorage.getItem(key) || "{}");
          const sessionUser = item?.user;
          if (sessionUser?.id === creatorId) {
            const meta = sessionUser.user_metadata;
            if (!creatorAvatar) {
              creatorAvatar =
                meta?.avatar_url || meta?.picture || meta?.avatar || null;
            }
            if (!creatorName) {
              creatorName = meta?.name || meta?.full_name || null;
            }
            break;
          }
        }
      }
    } catch {}
  }

  creatorName = creatorName || "Creator";

  // Proactively ensure creator exists in public.users before inserting post
  try {
    const { data: userRow } = await supabase
      .from("users")
      .select("uid, role")
      .or(`uid.eq.${creatorId},id.eq.${creatorId}`)
      .maybeSingle();
    if (!userRow) {
      await createUserProfile(creatorId, {
        name: creatorName,
        role: "creator",
      });
    } else if (userRow.role !== "creator" && userRow.role !== "admin") {
      await supabase
        .from("users")
        .update({ role: "creator" })
        .or(`uid.eq.${creatorId},id.eq.${creatorId}`);
    }
  } catch (profErr) {
    console.warn("Profile check before post insert note:", profErr);
  }

  const dbRecord: any = {
    creator_id: creatorId,
    content,
    media_url: mediaUrl,
    media_type: mediaType,
    is_locked: isLocked,
    price: isLocked ? price : 0,
    visibility,
    status,
  };

  let insertedId = newPostId;

  // 1. Try Supabase insert with full fields, fallback without visibility/status if columns not present
  try {
    let { data, error } = await supabase
      .from("posts")
      .insert(dbRecord)
      .select()
      .maybeSingle();
    if (error && (error.message.includes("column") || error.code === "42703")) {
      const basicRecord = {
        creator_id: creatorId,
        content,
        media_url: mediaUrl,
        media_type: mediaType,
        is_locked: isLocked,
        price: isLocked ? price : 0,
      };
      const retry = await supabase
        .from("posts")
        .insert(basicRecord)
        .select()
        .maybeSingle();
      data = retry.data;
      error = retry.error;
    }
    if (data?.id) {
      insertedId = data.id;
    }
    if (error) {
      console.warn("Supabase post insert note:", error.message);
      throw error;
    }
  } catch (err: any) {
    console.warn("Supabase post insert error:", err);
    throw err;
  }

  const postObj: any = {
    id: insertedId,
    creator_id: creatorId,
    content,
    media_url: mediaUrl,
    media_type: mediaType,
    is_locked: isLocked,
    price: isLocked ? price : 0,
    visibility,
    status,
    media_private: visibility !== "public" || status === "draft",
    created_at: new Date().toISOString(),
    likes_count: 0,
    comments_count: 0,
    users: {
      uid: creatorId,
      name: creatorName,
      avatar: creatorAvatar,
    },
  };

  // 2. Persist to localStorage client cache (tgd_all_posts)
  try {
    const key = "tgd_all_posts";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    const updated = [
      postObj,
      ...existing.filter((p: any) => p.id !== postObj.id),
    ];
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.warn("LocalStorage post save error:", err);
  }

  // 3. Dispatch real-time event so open feeds update immediately
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("posts_updated", { detail: { post: postObj } }),
    );
  }

  // 4. Notify active subscribers that this creator uploaded new content
  if (status === "published") {
    notifySubscribersOfNewContent(
      creatorId,
      creatorName,
      creatorAvatar,
      postObj,
    ).catch((err) => {
      console.warn("Could not dispatch subscriber post notifications:", err);
    });
  }

  return postObj;
};

export const updatePostAccess = async (
  postId: string,
  creatorId: string,
  visibility: "public" | "subscribers" | "ppv",
  status: "published" | "draft",
  price: number,
) => {
  const { data: currentPost, error: lookupError } = await supabase
    .from("posts")
    .select("media_url, media_private, status")
    .eq("id", postId)
    .eq("creator_id", creatorId)
    .maybeSingle();
  if (lookupError)
    throw new Error(
      `Could not load post access settings: ${lookupError.message}`,
    );
  if (!currentPost) throw new Error("Post not found. Refresh and try again.");
  const targetPrivate =
    visibility !== "public" || currentPost?.status === "draft";
  if (
    currentPost?.media_url &&
    Boolean(currentPost.media_private) !== targetPrivate
  ) {
    throw new Error(
      "Changing a post between public and paid access would not change its media storage permissions. Re-upload it with the desired access level instead.",
    );
  }

  const updates = {
    visibility,
    status,
    is_locked: visibility === "ppv",
    price: visibility === "ppv" ? price : 0,
    media_private: targetPrivate,
  };
  const { error } = await supabase
    .from("posts")
    .update(updates)
    .eq("id", postId)
    .eq("creator_id", creatorId);
  if (error) throw new Error(`Could not update post access: ${error.message}`);

  const cachedPosts = JSON.parse(localStorage.getItem("tgd_all_posts") || "[]");
  localStorage.setItem(
    "tgd_all_posts",
    JSON.stringify(
      cachedPosts.map((post: any) =>
        post.id === postId ? { ...post, ...updates } : post,
      ),
    ),
  );
  window.dispatchEvent(
    new CustomEvent("posts_updated", { detail: { postId } }),
  );
};

export const updatePostStatus = async (
  postId: string,
  creatorId: string,
  status: "published" | "draft",
) => {
  const { data: post, error: lookupError } = await supabase
    .from("posts")
    .select("media_url, media_private, visibility")
    .eq("id", postId)
    .eq("creator_id", creatorId)
    .maybeSingle();
  if (lookupError)
    throw new Error(`Could not load post status: ${lookupError.message}`);
  if (!post) throw new Error("Post not found. Refresh and try again.");

  let mediaUrl = post.media_url;
  let mediaPrivate = Boolean(post.media_private);
  if (
    status === "published" &&
    mediaPrivate &&
    post.visibility === "public" &&
    mediaUrl
  ) {
    const { data: file, error: downloadError } = await supabase.storage
      .from("creator-private-media")
      .download(mediaUrl);
    if (downloadError)
      throw new Error(
        `Could not publish draft media: ${downloadError.message}`,
      );
    const fileName = mediaUrl.split("/").pop() || `draft-${postId}`;
    const publicPath = `posts/${creatorId}/${Date.now()}_${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from("Daysman Gad")
      .upload(publicPath, file, { upsert: true });
    if (uploadError)
      throw new Error(`Could not publish draft media: ${uploadError.message}`);
    const { data: publicUrl } = supabase.storage
      .from("Daysman Gad")
      .getPublicUrl(publicPath);
    mediaUrl = publicUrl.publicUrl;
    mediaPrivate = false;
  } else if (status === "draft" && mediaUrl && !mediaPrivate) {
    throw new Error(
      "This post uses a public media URL. Delete and re-upload it as a draft to keep the media private.",
    );
  }

  const { error } = await supabase
    .from("posts")
    .update({ status, media_url: mediaUrl, media_private: mediaPrivate })
    .eq("id", postId)
    .eq("creator_id", creatorId);
  if (error) throw new Error(`Could not update post status: ${error.message}`);

  const cachedPosts = JSON.parse(localStorage.getItem("tgd_all_posts") || "[]");
  localStorage.setItem(
    "tgd_all_posts",
    JSON.stringify(
      cachedPosts.map((item: any) =>
        item.id === postId
          ? {
              ...item,
              status,
              media_url: mediaUrl,
              media_private: mediaPrivate,
            }
          : item,
      ),
    ),
  );
  window.dispatchEvent(
    new CustomEvent("posts_updated", { detail: { postId } }),
  );

  if (status === "published") {
    let creatorName = "Creator";
    let creatorAvatar: string | null = null;
    try {
      const { data: creatorUser } = await supabase
        .from("users")
        .select("name, avatar")
        .eq("uid", creatorId)
        .maybeSingle();
      if (creatorUser?.name) creatorName = creatorUser.name;
      if (creatorUser?.avatar) creatorAvatar = creatorUser.avatar;
    } catch {}

    notifySubscribersOfNewContent(creatorId, creatorName, creatorAvatar, {
      id: postId,
      creator_id: creatorId,
      media_url: mediaUrl,
      media_type: post.visibility === "ppv" ? "video" : "photo",
      is_locked: post.visibility === "ppv",
      visibility: post.visibility,
    }).catch((err) => {
      console.warn(
        "Could not dispatch subscriber post notifications on publish:",
        err,
      );
    });
  }
};

/**
 * Resiliently enriches posts with creator name and avatar without relying on foreign-key joins.
 * Guarantees that creator profile pictures match what creators have set.
 */
export const enrichPostsWithUsers = async (rawPosts: any[]) => {
  if (!rawPosts || rawPosts.length === 0) return [];
  const creatorIds = Array.from(
    new Set(rawPosts.map((p) => p.creator_id).filter(Boolean)),
  );
  if (creatorIds.length === 0) return rawPosts;

  const usersMap = new Map<
    string,
    { uid: string; name: string; avatar: string | null; cover_image?: string }
  >();

  // 1. Check local storage for creator profiles first (fastest and most accurate for user-set profile photos)
  creatorIds.forEach((id) => {
    const local = getStoredCreatorProfile(id);
    if (local) {
      usersMap.set(id, {
        uid: id,
        name: local.name || local.display_name || "Creator",
        avatar: local.avatar || local.avatar_url || null,
        cover_image: local.cover_image,
      });
    }
  });

  // Check Supabase auth session in localStorage for matching creator
  if (typeof window !== "undefined") {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("sb-") || key.includes("auth-token"))) {
          const item = JSON.parse(localStorage.getItem(key) || "{}");
          const sessionUser = item?.user;
          if (sessionUser && creatorIds.includes(sessionUser.id)) {
            const meta = sessionUser.user_metadata;
            const metaAvatar =
              meta?.avatar_url || meta?.picture || meta?.avatar;
            const metaName = meta?.name || meta?.full_name;
            const existing = usersMap.get(sessionUser.id);
            if (metaAvatar || metaName) {
              usersMap.set(sessionUser.id, {
                uid: sessionUser.id,
                name:
                  existing?.name && existing.name !== "Creator"
                    ? existing.name
                    : metaName || "Creator",
                avatar: existing?.avatar || metaAvatar || null,
                cover_image: existing?.cover_image,
              });
            }
          }
        }
      }
    } catch {}
  }

  // 2. Batch fetch from Supabase users table
  try {
    const { data: usersData } = await supabase
      .from("users")
      .select("uid, name, avatar")
      .in("uid", creatorIds);
    if (usersData) {
      usersData.forEach((u: any) => {
        const existing = usersMap.get(u.uid);
        usersMap.set(u.uid, {
          uid: u.uid,
          name:
            existing?.name && existing.name !== "Creator"
              ? existing.name
              : u.name || "Creator",
          avatar: existing?.avatar || u.avatar || null,
          cover_image: existing?.cover_image,
        });
      });
    }
  } catch (err) {
    console.warn("Could not batch fetch creator users:", err);
  }

  // 3. Batch fetch from creator_profiles table
  try {
    const { data: creatorProfiles } = await supabase
      .from("creator_profiles")
      .select("*")
      .in("user_id", creatorIds);
    if (creatorProfiles) {
      creatorProfiles.forEach((cp: any) => {
        const existing = usersMap.get(cp.user_id);
        const resolvedAvatar =
          existing?.avatar || cp.avatar_url || cp.avatar || null;
        const resolvedName =
          existing?.name && existing.name !== "Creator"
            ? existing.name
            : cp.display_name || "Creator";
        usersMap.set(cp.user_id, {
          uid: cp.user_id,
          name: resolvedName,
          avatar: resolvedAvatar,
          cover_image: cp.cover_image || existing?.cover_image,
        });
      });
    }
  } catch {}

  // 4. Batch fetch from escort_applications if avatar is still missing
  try {
    const missingAvatarIds = creatorIds.filter(
      (id) => !usersMap.get(id)?.avatar,
    );
    if (missingAvatarIds.length > 0) {
      const { data: apps } = await supabase
        .from("escort_applications")
        .select("creator_id, name, verification_photos")
        .in("creator_id", missingAvatarIds);
      if (apps) {
        apps.forEach((app: any) => {
          if (app.verification_photos && app.verification_photos.length > 0) {
            const existing = usersMap.get(app.creator_id);
            usersMap.set(app.creator_id, {
              uid: app.creator_id,
              name: existing?.name || app.name || "Creator",
              avatar: existing?.avatar || app.verification_photos[0],
              cover_image: existing?.cover_image,
            });
          }
        });
      }
    }
  } catch {}

  // 4.1 Storage assets check for creators whose avatar is still missing
  const stillMissingAvatarIds = creatorIds.filter(
    (id) => !usersMap.get(id)?.avatar && !id.startsWith("escort-"),
  );
  if (stillMissingAvatarIds.length > 0) {
    try {
      await Promise.all(
        stillMissingAvatarIds.map(async (cid) => {
          const assets = await getCreatorStorageAssets(cid);
          if (assets.avatar || assets.cover) {
            const existing = usersMap.get(cid);
            usersMap.set(cid, {
              uid: cid,
              name:
                existing?.name && existing.name !== "Creator"
                  ? existing.name
                  : cid === "b3bdd443-103e-45cb-986b-1d3d32659b3a"
                    ? "Joy Mwangi"
                    : "VIP Creator",
              avatar: existing?.avatar || assets.avatar || null,
              cover_image: existing?.cover_image || assets.cover || undefined,
            });
          }
        }),
      );
    } catch {}
  }

  // 4.2 Proactively resolve any creator whose name is still 'Creator' or missing
  for (const cid of creatorIds) {
    const existing = usersMap.get(cid);
    if (
      !existing ||
      !existing.name ||
      existing.name === "Creator" ||
      !existing.avatar
    ) {
      try {
        const fullProf = await getCreatorProfile(cid);
        if (fullProf && fullProf.name && fullProf.name !== "Creator") {
          usersMap.set(cid, {
            uid: cid,
            name: fullProf.name,
            avatar: fullProf.avatar || existing?.avatar || null,
            cover_image: fullProf.cover_image || existing?.cover_image,
          });
        }
      } catch {}
    }
  }

  // 5. Mock escorts map
  const escorts = getEscorts();
  const escortsMap = new Map(
    escorts.map((e) => [
      e.id,
      { uid: e.id, name: e.name, avatar: e.avatar, cover_image: e.cover_image },
    ]),
  );

  return rawPosts.map((post) => {
    const resolvedUser =
      usersMap.get(post.creator_id) || escortsMap.get(post.creator_id);

    // Prioritize the user's actual resolved profile photo!
    const finalAvatar = resolvedUser?.avatar || post.users?.avatar || null;
    const finalName =
      (resolvedUser?.name && resolvedUser.name !== "Creator"
        ? resolvedUser.name
        : null) ||
      (post.users?.name && post.users.name !== "Creator"
        ? post.users.name
        : null) ||
      resolvedUser?.name ||
      "Creator";

    const verified = isCreatorVerified(post.creator_id, post.isVerified);

    return {
      ...post,
      isVerified: verified,
      users: {
        uid: post.creator_id,
        name: finalName,
        avatar: finalAvatar,
        isVerified: verified,
      },
    };
  });
};

export const getPosts = async () => {
  let allPosts: any[] = [];
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      allPosts = [...data];
    }
  } catch (err) {
    console.error("getPosts error:", err);
  }

  // Merge localStorage posts
  try {
    const localPosts = JSON.parse(
      localStorage.getItem("tgd_all_posts") || "[]",
    );
    for (const lp of localPosts) {
      if (!allPosts.find((p) => p.id === lp.id)) {
        allPosts.push(lp);
      }
    }
  } catch {}

  allPosts.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const enriched = await enrichPostsWithUsers(allPosts);
  return enriched;
};

export const getPostsByCreator = async (
  creatorId: string,
  viewerId?: string,
) => {
  let dbPosts: any[] = [];
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("creator_id", creatorId)
      .order("created_at", { ascending: false });
    if (!error && data) {
      dbPosts = [...data];
    }
  } catch (err) {
    console.error("getPostsByCreator error:", err);
  }

  // Merge with localStorage
  try {
    const localPosts = JSON.parse(
      localStorage.getItem("tgd_all_posts") || "[]",
    );
    const creatorLocal = localPosts.filter(
      (p: any) => p.creator_id === creatorId,
    );
    for (const lp of creatorLocal) {
      if (!dbPosts.find((d) => d.id === lp.id)) {
        dbPosts.push(lp);
      }
    }
  } catch {}

  dbPosts.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  if (dbPosts.length === 0) {
    const fallbackMatches = FALLBACK_POSTS.filter(
      (p) => p.creator_id === creatorId,
    );
    if (fallbackMatches.length > 0) {
      return fallbackMatches;
    }
  }

  return resolvePrivatePostMedia(await enrichPostsWithUsers(dbPosts), viewerId);
};

export const getFanFeed = async (fanId: string, page = 0, limit = 30) => {
  let allRealPosts: any[] = [];

  // 1. Fetch real posts from Supabase (all posts on platform, newest first)
  try {
    allRealPosts = await fetchAllPages(async (offset, pageSize) => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);
      return { data, error };
    });
  } catch (err) {
    console.warn("Error fetching Supabase posts for feed:", err);
  }

  // 2. Merge posts from LocalStorage client cache
  try {
    const localPosts: any[] = JSON.parse(
      localStorage.getItem("tgd_all_posts") || "[]",
    );
    for (const lp of localPosts) {
      if (!allRealPosts.find((p) => p.id === lp.id)) {
        allRealPosts.push(lp);
      }
    }
  } catch (err) {
    console.warn("Error reading local posts for feed:", err);
  }

  // Sort real posts newest first
  allRealPosts.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  // 3. Identify creator subscriptions (prioritized at the top of the feed)
  let subscribedCreatorIds = new Set<string>();
  if (fanId) {
    // Current user's own posts always prioritize at top so creators see their posts immediately
    subscribedCreatorIds.add(fanId);

    try {
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("creator_id, expires_at")
        .eq("fan_id", fanId)
        .eq("status", "active");
      if (subs) {
        subs.forEach((s) => {
          if (!s.expires_at || new Date(s.expires_at).getTime() > Date.now()) {
            subscribedCreatorIds.add(s.creator_id);
          }
        });
      }
    } catch {}

    try {
      const localSubs = JSON.parse(
        localStorage.getItem(`tgd_fan_subs_${fanId}`) || "[]",
      );
      localSubs.forEach((s: any) => {
        if (
          s.status === "active" &&
          (!s.expires_at || new Date(s.expires_at).getTime() > Date.now())
        ) {
          subscribedCreatorIds.add(s.creator_id);
        }
      });
    } catch {}
  }

  // Split into priority (subscribed creators & own posts) and all other newly published creator posts
  const priorityPosts: any[] = [];
  const otherPosts: any[] = [];

  for (const post of allRealPosts) {
    if (subscribedCreatorIds.has(post.creator_id)) {
      priorityPosts.push(post);
    } else {
      otherPosts.push(post);
    }
  }

  // Visible posts: include all published posts (and author's own drafts if viewing own feed)
  const visiblePosts = [...priorityPosts, ...otherPosts].filter(
    (post) => post.status !== "draft" || (fanId && post.creator_id === fanId),
  );

  const enrichedReal = await resolvePrivatePostMedia(
    await enrichPostsWithUsers(visiblePosts),
    fanId,
    subscribedCreatorIds,
  );

  // Filter out posts from suspended creators from public feeds
  const nonSuspendedPosts = enrichedReal.filter((post) => {
    const creatorStatus =
      post.users?.status ||
      (typeof window !== "undefined"
        ? localStorage.getItem(`tgd_user_status_${post.creator_id}`)
        : null);
    return creatorStatus !== "suspended" && creatorStatus !== "banned";
  });

  // Return real posts first; if platform has few real posts (initial stage), append fallback feed posts
  let fullFeed = [...nonSuspendedPosts];
  if (fullFeed.length < 10) {
    const existingIds = new Set(fullFeed.map((p) => p.id));
    const fallbackToAdd = FALLBACK_POSTS.filter(
      (fp) => !existingIds.has(fp.id),
    );
    fullFeed = [...fullFeed, ...fallbackToAdd];
  }

  // 5. Paginate
  const start = page * limit;
  return fullFeed.slice(start, start + limit);
};

export const deletePost = async (postId: string) => {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      postId,
    );
  let mediaUrl: string | null = null;

  // 1. Find the media URL before deletion
  if (isUuid) {
    try {
      const { data: post } = await supabase
        .from("posts")
        .select("media_url")
        .eq("id", postId)
        .maybeSingle();
      if (post?.media_url) {
        mediaUrl = post.media_url;
      }
    } catch (lookupErr) {
      console.warn("Post lookup warning before delete:", lookupErr);
    }
  }

  // Fallback to cache for media URL if needed
  try {
    const cachedPosts = JSON.parse(
      localStorage.getItem("tgd_all_posts") || "[]",
    );
    const cached = cachedPosts.find((item: any) => item.id === postId);
    if (!mediaUrl && cached?.media_url) {
      mediaUrl = cached.media_url;
    }
    // Remove from local cache immediately
    const filtered = cachedPosts.filter((item: any) => item.id !== postId);
    localStorage.setItem("tgd_all_posts", JSON.stringify(filtered));
  } catch (cacheError) {
    console.warn("Could not update local posts cache on delete:", cacheError);
  }

  // 2. Delete the post record from Supabase database
  if (isUuid) {
    try {
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) console.warn("Supabase post delete warning:", error.message);
    } catch (dbErr) {
      console.warn("Supabase post delete exception:", dbErr);
    }
  }

  // 3. Delete the media asset (video or image) from Daysman Gad storage
  if (mediaUrl && !mediaUrl.startsWith("data:")) {
    try {
      let storagePath = mediaUrl;
      if (storagePath.includes("/object/public/Daysman%20Gad/")) {
        storagePath = decodeURIComponent(
          storagePath.split("/object/public/Daysman%20Gad/")[1],
        );
      } else if (storagePath.includes("/object/public/Daysman Gad/")) {
        storagePath = decodeURIComponent(
          storagePath.split("/object/public/Daysman Gad/")[1],
        );
      } else if (storagePath.includes("/Daysman%20Gad/")) {
        storagePath = decodeURIComponent(
          storagePath.split("/Daysman%20Gad/")[1],
        );
      } else if (storagePath.includes("/Daysman Gad/")) {
        storagePath = decodeURIComponent(storagePath.split("/Daysman Gad/")[1]);
      } else if (storagePath.includes("/hideaway%20post%20storage/")) {
        storagePath = decodeURIComponent(
          storagePath.split("/hideaway%20post%20storage/")[1],
        );
      }
      storagePath = storagePath.split("?")[0].replace(/^\/+/, "");

      // Remove from Daysman Gad storage (safe-guarding profile avatars and covers)
      if (
        storagePath &&
        !storagePath.startsWith("avatars/") &&
        !storagePath.startsWith("covers/") &&
        !storagePath.startsWith("kyc/")
      ) {
        await supabase.storage.from("Daysman Gad").remove([storagePath]);
      }
    } catch (storageError: any) {
      console.warn(
        "Could not delete media file from storage:",
        storageError?.message,
      );
    }
  }

  // 4. Dispatch events across all open tabs/components
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("posts_updated", { detail: { postId, deleted: true } }),
    );
    window.dispatchEvent(
      new CustomEvent("post_deleted", { detail: { postId } }),
    );
  }
};

// ========================
// LIKES
// ========================

export const getPostLikes = async (postId: string, userId?: string) => {
  const { count } = await supabase
    .from("post_likes")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);

  let userHasLiked = false;
  if (userId) {
    const { data } = await supabase
      .from("post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle();
    userHasLiked = !!data;
  }

  return { count: count || 0, userHasLiked };
};

export const toggleLike = async (
  postId: string,
  userId: string,
  currentlyLiked: boolean,
) => {
  const { data: userRow } = await supabase
    .from("users")
    .select("status")
    .eq("uid", userId)
    .maybeSingle();
  if (userRow?.status === "suspended" || userRow?.status === "banned") {
    throw new Error(
      "Your account is currently suspended and cannot like posts.",
    );
  }

  if (currentlyLiked) {
    await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
  } else {
    await supabase
      .from("post_likes")
      .insert({ post_id: postId, user_id: userId });

    // Send real-time notification to post author
    try {
      let creatorId = "";
      const { data: postData } = await supabase
        .from("posts")
        .select("creator_id")
        .eq("id", postId)
        .maybeSingle();

      if (postData?.creator_id) {
        creatorId = postData.creator_id;
      } else {
        const localPosts = JSON.parse(
          localStorage.getItem("tgd_all_posts") || "[]",
        );
        const p = localPosts.find((item: any) => item.id === postId);
        if (p?.creator_id) creatorId = p.creator_id;
      }

      if (creatorId && creatorId !== userId) {
        let likerName = "A subscriber";
        let likerAvatar: string | undefined = undefined;
        const { data: fanUser } = await supabase
          .from("users")
          .select("name, avatar")
          .eq("uid", userId)
          .maybeSingle();
        if (fanUser?.name) likerName = fanUser.name;
        if (fanUser?.avatar) likerAvatar = fanUser.avatar;

        await createNotification(creatorId, {
          title: "New Like on Your Post ❤️",
          message: `${likerName} liked your post!`,
          type: "like",
          link: "/creator/feed",
          avatar: likerAvatar,
          action_label: "View Post",
          action_url: "/creator/feed",
          badge: "Reaction",
        });
      }
    } catch (notifErr) {
      console.warn("Could not dispatch like notification:", notifErr);
    }
  }
};

// ========================
// COMMENTS
// ========================

export const getComments = async (postId: string) => {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) console.error("getComments error:", error.message);
  if (!data || data.length === 0) return [];

  // Fetch user info for each commenter separately (no FK defined)
  const withUsers = await Promise.all(
    data.map(async (comment: any) => {
      let userInfo: any = null;
      try {
        userInfo = await getUserProfile(comment.user_id);
      } catch {}
      return {
        ...comment,
        users: userInfo
          ? {
              name: userInfo.name,
              avatar: userInfo.avatar,
            }
          : null,
      };
    }),
  );
  return withUsers;
};

export const addComment = async (
  postId: string,
  userId: string,
  content: string,
) => {
  const { data: userRow } = await supabase
    .from("users")
    .select("status")
    .eq("uid", userId)
    .maybeSingle();
  if (userRow?.status === "suspended" || userRow?.status === "banned") {
    throw new Error(
      "Your account is currently suspended and cannot post comments.",
    );
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, user_id: userId, content })
    .select("*")
    .single();
  if (error) throw error;

  // Send real-time notification to post author
  try {
    let creatorId = "";
    const { data: postData } = await supabase
      .from("posts")
      .select("creator_id")
      .eq("id", postId)
      .maybeSingle();

    if (postData?.creator_id) {
      creatorId = postData.creator_id;
    } else {
      const localPosts = JSON.parse(
        localStorage.getItem("tgd_all_posts") || "[]",
      );
      const p = localPosts.find((item: any) => item.id === postId);
      if (p?.creator_id) creatorId = p.creator_id;
    }

    if (creatorId && creatorId !== userId) {
      let commenterName = "A subscriber";
      let commenterAvatar: string | undefined = undefined;
      const { data: fanUser } = await supabase
        .from("users")
        .select("name, avatar")
        .eq("uid", userId)
        .maybeSingle();
      if (fanUser?.name) commenterName = fanUser.name;
      if (fanUser?.avatar) commenterAvatar = fanUser.avatar;

      const snippet =
        content.length > 60 ? `${content.slice(0, 60)}...` : content;

      await createNotification(creatorId, {
        title: "New Comment on Your Post 💬",
        message: `${commenterName} commented: "${snippet}"`,
        type: "comment",
        link: "/creator/feed",
        avatar: commenterAvatar,
        action_label: "View Comment",
        action_url: "/creator/feed",
        badge: "Comment",
      });
    }
  } catch (notifErr) {
    console.warn("Could not dispatch comment notification:", notifErr);
  }

  return data;
};

// ========================
// 4. TRANSACTIONS (Wallet)
// ========================

export const processPayment = async (
  type: "tip" | "subscription" | "ppv",
  fromUserId: string,
  toCreatorId: string,
  grossAmount: number,
  referenceId?: string,
  _postId?: string,
) => {
  const { platformFee, creatorNet: netAmount } = calculateFeeSplit(grossAmount);

  let tx: any = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    from_user_id: fromUserId,
    to_creator_id: toCreatorId,
    gross_amount: grossAmount,
    platform_fee: platformFee,
    net_amount: netAmount,
    status: "completed",
    reference_id: referenceId || null,
    created_at: new Date().toISOString(),
  };
  let transactionRecorded = false;

  try {
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        type,
        from_user_id: fromUserId,
        to_creator_id: toCreatorId,
        gross_amount: grossAmount,
        platform_fee: platformFee,
        net_amount: netAmount,
        status: "completed",
      })
      .select()
      .maybeSingle();

    if (data) {
      tx = { ...data };
      transactionRecorded = true;
    }
    if (error) {
      console.error(
        "Confirmed payment transaction could not be recorded:",
        error.message,
      );
    }
  } catch (err: any) {
    console.error(
      "Confirmed payment transaction insert failed:",
      err?.message || err,
    );
  }
  tx = { ...tx, transaction_recorded: transactionRecorded };

  // Cache locally so transaction records are immediately visible in wallet/history
  try {
    const localKey = "tgd_all_transactions";
    const list = JSON.parse(localStorage.getItem(localKey) || "[]");
    localStorage.setItem(localKey, JSON.stringify([tx, ...list]));
  } catch {}

  // Trigger Creator Notification for Tips and PPV unlocks
  try {
    let fanName = "A fan";
    const { data: fanUser } = await supabase
      .from("users")
      .select("name")
      .eq("uid", fromUserId)
      .maybeSingle();
    if (fanUser?.name) fanName = fanUser.name;

    if (type === "tip") {
      await createNotification(toCreatorId, {
        title: "New Tip Received! 💰",
        message: `${fanName} tipped you KES ${grossAmount.toLocaleString()}! KES ${netAmount.toLocaleString()} (after 30% platform fee) has been credited to your wallet.`,
        type: "tip",
        link: "/wallet",
        action_label: "View Wallet",
        action_url: "/wallet",
        badge: "Tip",
      });
    } else if (type === "ppv") {
      await createNotification(toCreatorId, {
        title: "PPV Content Unlocked! 🔓",
        message: `${fanName} unlocked your Pay-Per-View content for KES ${grossAmount.toLocaleString()}. KES ${netAmount.toLocaleString()} (after 30% platform fee) has been credited to your wallet.`,
        type: "ppv",
        link: "/wallet",
        action_label: "View Wallet",
        action_url: "/wallet",
        badge: "PPV Unlock",
      });
    }
  } catch (notifErr) {
    console.warn("Could not dispatch creator payment notification:", notifErr);
  }

  // Notify Admins about confirmed platform payments
  try {
    const [{ data: fanUser }, { data: creatorUser }] = await Promise.all([
      supabase.from("users").select("name").eq("uid", fromUserId).maybeSingle(),
      supabase
        .from("users")
        .select("name")
        .eq("uid", toCreatorId)
        .maybeSingle(),
    ]);
    const fanName = fanUser?.name || "A customer";
    const creatorName = creatorUser?.name || "a creator";

    const titles: Record<string, string> = {
      subscription: `New VIP Subscriber Payment! 👑`,
      tip: `New Creator Tip Sent! 💰`,
      ppv: `New PPV Content Unlocked! 🔓`,
    };

    await notifyAdmins({
      title: titles[type] || `New Payment: KES ${grossAmount.toLocaleString()}`,
      message: `${fanName} paid KES ${grossAmount.toLocaleString()} to ${creatorName} (${type.toUpperCase()}). Net: KES ${netAmount.toLocaleString()}, Platform Fee: KES ${platformFee.toLocaleString()}.`,
      type:
        type === "subscription"
          ? "subscription"
          : type === "ppv"
            ? "ppv"
            : "tip",
      link: "/admin/transactions",
      action_label: "View Transactions",
      action_url: "/admin/transactions",
      badge: type.toUpperCase(),
    });
  } catch (err) {
    console.error("Could not notify admins about confirmed payment:", err);
  }

  // Trigger Subscriber Notification (Receipt & Access Confirmation)
  try {
    if (fromUserId && fromUserId !== toCreatorId) {
      let creatorName = "Creator";
      const { data: creatorUser } = await supabase
        .from("users")
        .select("name")
        .eq("uid", toCreatorId)
        .maybeSingle();
      if (creatorUser?.name) creatorName = creatorUser.name;

      if (type === "tip") {
        await createNotification(fromUserId, {
          title: "Tip Sent Successfully! 🎁",
          message: `Your tip of KES ${grossAmount.toLocaleString()} has been sent to ${creatorName}. Thank you for your support!`,
          type: "tip",
          link: `/creator/${toCreatorId}`,
          action_label: "View Creator",
          action_url: `/creator/${toCreatorId}`,
          badge: "Tip Sent",
        });
      } else if (type === "ppv") {
        await createNotification(fromUserId, {
          title: "PPV Content Unlocked! 🔓",
          message: `You unlocked exclusive Pay-Per-View content from ${creatorName} for KES ${grossAmount.toLocaleString()}. It is now available to view anytime.`,
          type: "ppv",
          link: `/user`,
          action_label: "View in Feed",
          action_url: `/user`,
          badge: "PPV Unlocked",
        });
      }
    }
  } catch (fanNotifErr) {
    console.warn(
      "Could not dispatch subscriber payment receipt notification:",
      fanNotifErr,
    );
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("wallet_updated", { detail: { creatorId: toCreatorId } }),
    );
  }

  return tx;
};

export const getCreatorTransactions = async (creatorId: string) => {
  let remoteTxs: any[] = [];
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("to_creator_id", creatorId)
      .order("created_at", { ascending: false });
    if (error) console.error("getCreatorTransactions error:", error.message);
    if (data) remoteTxs = data;
  } catch (err) {
    console.error("getCreatorTransactions exception:", err);
  }

  let localTxs: any[] = [];
  if (typeof window !== "undefined") {
    try {
      const list = JSON.parse(
        localStorage.getItem("tgd_all_transactions") || "[]",
      );
      localTxs = list.filter((t: any) => t.to_creator_id === creatorId);
    } catch {}
  }

  const seen = new Set<string>();
  const merged: any[] = [];
  for (const item of [...remoteTxs, ...localTxs]) {
    const key =
      item.id || `${item.type}_${item.created_at}_${item.gross_amount}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }

  merged.sort(
    (a, b) =>
      new Date(b.created_at || 0).getTime() -
      new Date(a.created_at || 0).getTime(),
  );
  return merged;
};

// ========================
// 5. SUBSCRIPTIONS
// ========================

export const subscribeToCreator = async (
  fanId: string,
  creatorId: string,
  tierName: string = "VIP Tier",
  price: number = 1000,
  durationDays: number = 30,
  paymentReference?: string,
) => {
  const payment = await processPayment(
    "subscription",
    fanId,
    creatorId,
    price,
    paymentReference,
  );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);
  const expiresIso = expiresAt.toISOString();

  let subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .insert({
        fan_id: fanId,
        creator_id: creatorId,
        tier_name: tierName,
        status: "active",
        expires_at: expiresIso,
      })
      .select()
      .maybeSingle();

    if (data?.id) subId = data.id;
    if (error)
      console.warn("Supabase subscription insert note:", error.message);
  } catch (err) {
    console.warn("Supabase subscription insert error:", err);
  }

  // Local storage cache for offline/instant client sync
  try {
    const subRecord = {
      id: subId,
      fan_id: fanId,
      creator_id: creatorId,
      tier_name: tierName,
      status: "active",
      price,
      duration_days: durationDays,
      created_at: new Date().toISOString(),
      expires_at: expiresIso,
    };
    localStorage.setItem(
      `tgd_sub_${fanId}_${creatorId}`,
      JSON.stringify(subRecord),
    );

    const fanListKey = `tgd_fan_subs_${fanId}`;
    const existingList = JSON.parse(localStorage.getItem(fanListKey) || "[]");
    const updatedList = [
      subRecord,
      ...existingList.filter((s: any) => s.creator_id !== creatorId),
    ];
    localStorage.setItem(fanListKey, JSON.stringify(updatedList));
  } catch (e) {
    console.warn("LocalStorage subscription cache error:", e);
  }

  // Increment creator subscriber count in creator_profiles
  try {
    const { data: profile } = await supabase
      .from("creator_profiles")
      .select("total_subscribers")
      .eq("user_id", creatorId)
      .maybeSingle();

    if (profile) {
      await supabase
        .from("creator_profiles")
        .update({ total_subscribers: (profile.total_subscribers || 0) + 1 })
        .eq("user_id", creatorId);
    }
  } catch (e) {
    console.warn("Error incrementing subscriber count:", e);
  }

  // Send Immediate Notification to Creator
  try {
    let fanName = "A subscriber";
    const { data: fanUser } = await supabase
      .from("users")
      .select("name")
      .eq("uid", fanId)
      .maybeSingle();
    if (fanUser?.name) fanName = fanUser.name;

    await createNotification(creatorId, {
      title: "New VIP Subscriber! 👑",
      message: buildCreatorSubscriptionMessage(
        fanName,
        tierName,
        durationDays,
        price,
        payment.net_amount,
        payment.transaction_recorded,
      ),
      type: "subscription",
      link: "/wallet",
      action_label: "View Wallet",
      action_url: "/wallet",
      badge: "VIP Fan",
    });
  } catch (err) {
    console.warn("Error sending subscription notification to creator:", err);
  }

  // Send Immediate Confirmation Notification to Subscriber
  try {
    let creatorName = "Creator";
    let creatorAvatar: string | undefined = undefined;
    const { data: creatorUser } = await supabase
      .from("users")
      .select("name, avatar")
      .eq("uid", creatorId)
      .maybeSingle();
    if (creatorUser?.name) creatorName = creatorUser.name;
    if (creatorUser?.avatar) creatorAvatar = creatorUser.avatar;

    await createNotification(fanId, {
      title: "VIP Subscription Active! 👑",
      message: `You are now subscribed to ${creatorName}'s ${tierName} (${durationDays} days). Enjoy full access to exclusive posts!`,
      type: "subscription",
      link: `/creator/${creatorId}`,
      avatar: creatorAvatar,
      action_label: "View Creator Profile",
      action_url: `/creator/${creatorId}`,
      badge: "VIP Active",
    });
  } catch (err) {
    console.warn("Error sending subscription notification to subscriber:", err);
  }

  // Trigger automated welcome message in direct chat
  try {
    const { data: creatorUser } = await supabase
      .from("users")
      .select("name")
      .eq("uid", creatorId)
      .maybeSingle();
    await createAutomatedWelcomeMessage(creatorId, fanId, creatorUser?.name);
  } catch {}

  return {
    id: subId,
    fan_id: fanId,
    creator_id: creatorId,
    tier_name: tierName,
    status: "active",
    expires_at: expiresIso,
    expiresAt: expiresIso,
    durationDays,
    price,
  };
};

export const getFanSubscriptions = async (fanId: string) => {
  try {
    let allSubs: any[] = [];
    const { data: subs, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("fan_id", fanId)
      .order("created_at", { ascending: false });

    if (!error && subs) {
      allSubs = [...subs];
    }

    // Merge with local storage cache
    try {
      const localList = JSON.parse(
        localStorage.getItem(`tgd_fan_subs_${fanId}`) || "[]",
      );
      for (const loc of localList) {
        if (!allSubs.find((s: any) => s.creator_id === loc.creator_id)) {
          allSubs.push(loc);
        }
      }
    } catch {}

    if (allSubs.length === 0) return [];

    const escorts = getEscorts();
    const enriched = await Promise.all(
      allSubs.map(async (sub: any) => {
        // 1. Check if matches hardcoded escort
        const matchedEscort = escorts.find((e) => e.id === sub.creator_id);
        if (matchedEscort) {
          return {
            ...sub,
            creator: {
              id: matchedEscort.id,
              name: matchedEscort.name,
              avatar: matchedEscort.avatar,
              handle: `@${matchedEscort.name.replace(/\s+/g, "").toLowerCase()}`,
              isVerified: matchedEscort.isVerified,
              price: matchedEscort.price_hr || 1000,
            },
          };
        }

        // 2. Check Local Cache & Supabase users table
        const localProfile = getStoredCreatorProfile(sub.creator_id);
        let creatorAvatar =
          localProfile?.avatar || localProfile?.avatar_url || null;
        let creatorName =
          localProfile?.name ||
          localProfile?.display_name ||
          sub.creator_name ||
          "Creator";

        let creatorKycStatus: unknown;
        try {
          const { data: userProfile } = await supabase
            .from("users")
            .select("uid, name, avatar, email, role, kyc_status")
            .eq("uid", sub.creator_id)
            .maybeSingle();

          if (userProfile) {
            creatorName = userProfile.name || creatorName;
            creatorAvatar = userProfile.avatar || creatorAvatar;
            creatorKycStatus = userProfile.kyc_status;
          }
        } catch {
          // continue
        }

        const fallbackAvatar = resolveUserAvatar(creatorAvatar, creatorName);

        return {
          ...sub,
          creator: {
            id: sub.creator_id,
            name: creatorName,
            avatar: fallbackAvatar,
            handle: `@${creatorName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "creator"}`,
            isVerified: isKycVerified(creatorKycStatus),
            price: 1000,
          },
        };
      }),
    );

    return enriched;
  } catch (err) {
    console.error("getFanSubscriptions error:", err);
    return [];
  }
};

export const checkUserSubscription = async (
  fanId: string,
  creatorId: string,
) => {
  try {
    let sub: any = null;

    // 1. Check Supabase subscriptions table
    const { data, error } = await supabase
      .from("subscriptions")
      .select("id, tier_name, status, expires_at")
      .eq("fan_id", fanId)
      .eq("creator_id", creatorId)
      .eq("status", "active")
      .order("expires_at", { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      sub = data[0];
    }

    // 2. Check LocalStorage fallback
    if (!sub) {
      try {
        const local = localStorage.getItem(`tgd_sub_${fanId}_${creatorId}`);
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed.status === "active") {
            sub = parsed;
          }
        }
      } catch {}
    }

    if (!sub) return null;

    // 3. Automated Expiration & Content Re-locking
    // If the expires_at timestamp has passed, mark expired and return null so all content locks
    if (sub.expires_at && new Date(sub.expires_at) < new Date()) {
      if (sub.id) {
        try {
          supabase
            .from("subscriptions")
            .update({ status: "expired" })
            .eq("id", sub.id)
            .then(
              () => {},
              () => {},
            );
        } catch {}
      }
      try {
        const local = localStorage.getItem(`tgd_sub_${fanId}_${creatorId}`);
        if (local) {
          const parsed = JSON.parse(local);
          parsed.status = "expired";
          localStorage.setItem(
            `tgd_sub_${fanId}_${creatorId}`,
            JSON.stringify(parsed),
          );
        }
      } catch {}
      return null;
    }

    return sub;
  } catch (err) {
    console.error("checkUserSubscription error:", err);
    return null;
  }
};

export const cancelSubscription = async (subId: string) => {
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("id", subId);
  if (error) throw error;
};

export const getCreatorProfile = async (id: string) => {
  // 1. Escorts / hardcoded check ONLY if ID starts with 'escort-'
  if (id.startsWith("escort-")) {
    const escort = getEscorts().find((e) => e.id === id);
    if (escort) {
      return {
        id: escort.id,
        name: escort.name,
        avatar: escort.avatar,
        cover_image: escort.cover_image,
        bio: escort.bio,
        location: escort.location,
        rating: escort.rating,
        isVerified: escort.isVerified,
        isOnline: escort.isOnline,
        price_hr: escort.price_hr,
        age: escort.age,
        services: escort.services,
        gallery: escort.gallery || [],
        promo_discount: 50,
        promo_active: true,
        isEscort: true,
      };
    }
  }

  // 2. Check local creator cache first (fastest and most accurate for user-set profile photos)
  const localCreator = getStoredCreatorProfile(id);

  // 3. Storage assets check (Daysman Gad)
  const storageAssets = await getCreatorStorageAssets(id);

  // 4. Database user check
  try {
    let userRow: any = null;
    try {
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("uid", id)
        .maybeSingle();
      userRow = data;
    } catch {}

    let creatorMeta: any = null;
    try {
      const { data } = await supabase
        .from("creator_profiles")
        .select("*")
        .eq("user_id", id)
        .maybeSingle();
      creatorMeta = data;
    } catch {}

    let appMeta: any = null;
    try {
      const { data } = await supabase
        .from("escort_applications")
        .select("*")
        .eq("creator_id", id)
        .maybeSingle();
      appMeta = data;
    } catch {}

    let authMeta: any = null;
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id === id) {
        authMeta = data.user.user_metadata;
      }
    } catch {}

    // Check if creator has posts
    let hasPosts = false;
    try {
      const { data: userPosts } = await supabase
        .from("posts")
        .select("id, media_url")
        .eq("creator_id", id)
        .limit(5);
      if (userPosts && userPosts.length > 0) hasPosts = true;
    } catch {}

    const resolvedName =
      localCreator?.name ||
      localCreator?.display_name ||
      userRow?.name ||
      creatorMeta?.display_name ||
      authMeta?.name ||
      authMeta?.full_name ||
      appMeta?.name ||
      (id === "b3bdd443-103e-45cb-986b-1d3d32659b3a"
        ? "Joy Mwangi"
        : "VIP Creator");

    const rawAvatar =
      localCreator?.avatar ||
      localCreator?.avatar_url ||
      userRow?.avatar ||
      storageAssets.avatar ||
      creatorMeta?.avatar_url ||
      creatorMeta?.avatar ||
      authMeta?.avatar_url ||
      authMeta?.picture ||
      appMeta?.verification_photos?.[0];

    const resolvedAvatar = resolveUserAvatar(
      rawAvatar && !rawAvatar.startsWith("blob:") ? rawAvatar : null,
      resolvedName,
    );

    const rawCover =
      (localCreator?.cover_image &&
      !isVideoMediaUrl(localCreator.cover_image) &&
      !localCreator.cover_image.startsWith("blob:") &&
      !localCreator.cover_image.includes("photo-1549490349-8643362247b5")
        ? localCreator.cover_image
        : null) ||
      (storageAssets.cover && !isVideoMediaUrl(storageAssets.cover)
        ? storageAssets.cover
        : null) ||
      (creatorMeta?.cover_image &&
      !isVideoMediaUrl(creatorMeta.cover_image) &&
      !creatorMeta.cover_image.startsWith("blob:") &&
      !creatorMeta.cover_image.includes("photo-1549490349-8643362247b5")
        ? creatorMeta.cover_image
        : null);

    const resolvedCover = rawCover || "/default-cover.jpg";

    const resolvedBio =
      localCreator?.bio ||
      creatorMeta?.bio ||
      userRow?.bio ||
      "Welcome to my official creator page! Exclusive posts, videos, and private chats.";
    const profileDob = userRow?.dob || creatorMeta?.dob || localCreator?.dob;
    const profileAge = profileDob ? calculateAge(String(profileDob)) : null;
    const publicGender = getPublicGenderLabel(
      userRow?.gender || creatorMeta?.gender || localCreator?.gender,
      userRow?.gender_description ||
        creatorMeta?.gender_description ||
        localCreator?.gender_description,
    );

    if (
      userRow ||
      localCreator ||
      creatorMeta ||
      authMeta ||
      appMeta ||
      storageAssets.avatar ||
      storageAssets.cover ||
      hasPosts
    ) {
      const isSuspended =
        userRow?.status === "suspended" ||
        userRow?.status === "banned" ||
        userRow?.role === "suspended_creator" ||
        creatorMeta?.status === "suspended" ||
        (typeof window !== "undefined" &&
          localStorage.getItem(`tgd_user_status_${id}`) === "suspended");

      return {
        id: id,
        name: resolvedName,
        avatar: resolvedAvatar,
        cover_image: resolvedCover,
        bio: resolvedBio,
        location:
          localCreator?.location || creatorMeta?.location || "Nairobi, Kenya",
        rating: 4.9,
        isVerified:
          !isUnverifiedDiscoverUser(resolvedName, userRow?.email, id) &&
          (isSelectedVerifiedCreator(resolvedName, userRow?.email, id) ||
            isCreatorVerified(
              id,
              userRow?.is_verified ??
                creatorMeta?.is_verified ??
                localCreator?.is_verified,
              userRow?.kyc_status ||
                creatorMeta?.kyc_status ||
                localCreator?.kyc_status,
            )),
        isOnline: isSuspended ? false : true,
        price_hr:
          localCreator?.monthly_price || creatorMeta?.monthly_price || 1000,
        age: profileAge ?? localCreator?.age ?? creatorMeta?.age ?? null,
        gender: publicGender,
        services: localCreator?.tags ||
          creatorMeta?.tags || [
            "VIP Content",
            "Direct Chat",
            "Exclusive Photos",
          ],
        gallery: localCreator?.gallery || creatorMeta?.gallery || [],
        promo_discount:
          localCreator?.promo_discount ?? creatorMeta?.promo_discount ?? 50,
        promo_active:
          localCreator?.promo_active ?? creatorMeta?.promo_active !== false,
        total_subscribers:
          creatorMeta?.total_subscribers ??
          localCreator?.total_subscribers ??
          0,
        isEscort: false,
        status: isSuspended ? "suspended" : "active",
        isSuspended: Boolean(isSuspended),
      };
    }
  } catch (err) {
    console.error("Error fetching creator profile from DB:", err);
  }

  // Fallback to localCreator if DB query failed
  if (localCreator) {
    return {
      id: id,
      name: localCreator.name || "Creator",
      avatar: resolveUserAvatar(localCreator.avatar, localCreator.name),
      cover_image:
        (localCreator.cover_image &&
        !isVideoMediaUrl(localCreator.cover_image) &&
        !localCreator.cover_image.includes("photo-1549490349-8643362247b5")
          ? localCreator.cover_image
          : null) || "/default-cover.jpg",
      bio: localCreator.bio || "Welcome to my official creator page!",
      location: localCreator.location || "Nairobi, Kenya",
      rating: 4.9,
      isVerified: isCreatorVerified(id, localCreator?.isVerified),
      isOnline: true,
      price_hr: localCreator.monthly_price || 1000,
      age: localCreator.dob
        ? calculateAge(String(localCreator.dob))
        : localCreator.age || null,
      gender: getPublicGenderLabel(
        localCreator.gender,
        localCreator.gender_description,
      ),
      services: localCreator.tags || ["VIP Content", "Exclusive Photos"],
      gallery: [],
      promo_discount: 50,
      promo_active: true,
      total_subscribers: localCreator.total_subscribers || 0,
      isEscort: false,
    };
  }

  // Last fallback if matches escort
  const escortFallback = getEscorts().find((e) => e.id === id);
  if (escortFallback) return escortFallback;

  // Fallback to mock feed creator if matches FALLBACK_POSTS
  const fallbackPost = FALLBACK_POSTS.find((p) => p.creator_id === id);
  if (fallbackPost) {
    return {
      id: id,
      name: fallbackPost.users?.name || "VIP Creator",
      avatar:
        fallbackPost.users?.avatar ||
        "https://i.pinimg.com/736x/21/4c/1b/214c1b53137efff7f8e4e995d7fe8b11.jpg?w=500&q=80",
      cover_image: fallbackPost.media_url || "/default-cover.jpg",
      bio:
        fallbackPost.content ||
        "Welcome to my official creator page! Exclusive posts, videos, and private chats.",
      location: "Nairobi, Kenya",
      rating: 4.9,
      isVerified: false,
      isDemo: true,
      isOnline: true,
      price_hr: fallbackPost.price || 1000,
      age: 23,
      services: ["VIP Content", "Exclusive Photos", "Direct Chat"],
      gallery: [fallbackPost.media_url],
      promo_discount: 50,
      promo_active: true,
      isEscort: false,
    };
  }

  // Fallback to user hardcoded discover creator
  const hardcodedMatch = HARDCODED_DISCOVER_CREATORS.find((c) => c.id === id);
  if (hardcodedMatch) {
    return {
      id: hardcodedMatch.id,
      name: hardcodedMatch.name,
      avatar: hardcodedMatch.avatar,
      cover_image: hardcodedMatch.cover,
      bio: `Welcome to my official creator page! Follow my exclusive posts, photos, and direct VIP chat.`,
      location: hardcodedMatch.location,
      rating: 4.9,
      isVerified: false,
      isDemo: true,
      isOnline: true,
      price_hr:
        parseInt(String(hardcodedMatch.price).replace(/\D/g, ""), 10) || 1000,
      age: 24,
      services: [hardcodedMatch.category, "VIP Access", "Direct Chat"],
      gallery: [hardcodedMatch.cover],
      promo_discount: 50,
      promo_active: true,
      isEscort: false,
    };
  }

  return null;
};

/**
 * Get accurate, live active subscriber count for any creator.
 * Queries Supabase subscriptions table, with fallback to creator_profiles.total_subscribers
 * and local storage, ensuring brand new creators show 0 instead of fake numbers.
 */
export const getCreatorSubscriberCount = async (
  creatorId: string,
): Promise<number> => {
  if (!creatorId) return 0;

  // 1. Query Supabase subscriptions table for active subscriptions
  try {
    const { count, error } = await supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("creator_id", creatorId)
      .eq("status", "active");

    if (!error && typeof count === "number") {
      return count;
    }
  } catch (err) {
    console.warn("Error querying subscriptions table for count:", err);
  }

  // 2. Fallback to creator_profiles.total_subscribers
  try {
    const { data } = await supabase
      .from("creator_profiles")
      .select("total_subscribers")
      .eq("user_id", creatorId)
      .maybeSingle();

    if (
      data?.total_subscribers !== undefined &&
      data?.total_subscribers !== null
    ) {
      return Number(data.total_subscribers) || 0;
    }
  } catch {}

  // 3. Fallback to local storage cached creator profile
  try {
    const local = getStoredCreatorProfile(creatorId);
    if (
      local?.total_subscribers !== undefined &&
      local?.total_subscribers !== null
    ) {
      return Number(local.total_subscribers) || 0;
    }
  } catch {}

  return 0;
};

export const HARDCODED_DISCOVER_CREATORS = [
  {
    id: "creator-wairimu",
    name: "Wairimu K. ✨",
    handle: "@wairimuk",
    category: "Swimwear & BTS",
    location: "Nairobi, Kenya",
    gender: "Woman",
    subs: "342 subscribers",
    subscribersCount: 342,
    price: "KES 1,000/mo",
    avatar:
      "https://i.pinimg.com/736x/be/39/5d/be395de0b5e63dea55bf6be0bd00a548.jpg",
    cover:
      "https://i.pinimg.com/736x/be/39/5d/be395de0b5e63dea55bf6be0bd00a548.jpg",
    hasPosts: true,
    isVerified: true,
    isDemo: true,
    postsCount: 1,
    createdAt: "2026-10-18T12:00:00Z",
  },
  {
    id: "creator-chebet",
    name: "Chebet Fit & Spice 🔥",
    handle: "@chebetfit",
    category: "Fitness & Spice",
    location: "Eldoret / Nairobi",
    gender: "Woman",
    subs: "512 subscribers",
    subscribersCount: 512,
    price: "KES 1,200/mo",
    avatar:
      "https://i.pinimg.com/736x/63/d3/79/63d3791235f63c60e78d9a868b6bea67.jpg",
    cover:
      "https://i.pinimg.com/736x/63/d3/79/63d3791235f63c60e78d9a868b6bea67.jpg",
    hasPosts: true,
    isVerified: true,
    isDemo: true,
    postsCount: 1,
    createdAt: "2026-10-18T11:00:00Z",
  },
];

export const getDiscoverCreators = async () => {
  try {
    // 1. Fetch all posts to identify creators who have actually posted on the feeds
    let allPosts: any[] = [];
    try {
      allPosts = await fetchAllPages(async (offset, pageSize) => {
        const { data, error } = await supabase
          .from("posts")
          .select(
            "id, creator_id, media_url, is_locked, price, created_at, status",
          )
          .order("created_at", { ascending: false })
          .range(offset, offset + pageSize - 1);
        return { data, error };
      });
    } catch (err) {
      console.warn("Could not fetch posts for creator discovery:", err);
    }

    try {
      const localPosts = JSON.parse(
        localStorage.getItem("tgd_all_posts") || "[]",
      );
      for (const lp of localPosts) {
        if (!allPosts.find((p) => p.id === lp.id)) allPosts.push(lp);
      }
    } catch {}

    // Map creator_id -> post stats
    const postsByCreator = new Map<
      string,
      { count: number; latestCover: string; latestDate: string }
    >();
    allPosts.forEach((p) => {
      if (!p.creator_id) return;
      const isImg = p.media_url && !isVideoMediaUrl(p.media_url);
      const existing = postsByCreator.get(p.creator_id);
      if (!existing) {
        postsByCreator.set(p.creator_id, {
          count: 1,
          latestCover: isImg ? p.media_url : "",
          latestDate: p.created_at || new Date().toISOString(),
        });
      } else {
        existing.count += 1;
        if (!existing.latestCover && isImg) {
          existing.latestCover = p.media_url;
        }
      }
    });

    // 2. Fetch all real creator accounts from 'users' table
    let creatorUsers: any[] = [];
    try {
      const { data: usersData, error: uErr } = await supabase
        .from("users")
        .select(
          "uid, name, email, avatar, role, phone, created_at, cover_image, status, kyc_status, is_verified, payout_kyc_required, gender, gender_description, dob",
        )
        .in("role", ["creator", "pending_creator", "escort"]);
      if (usersData) {
        creatorUsers = [...usersData];
      } else if (uErr) {
        const { data: baseData } = await supabase
          .from("users")
          .select(
            "uid, name, email, avatar, role, phone, created_at, cover_image, status, kyc_status, is_verified, gender, gender_description, dob",
          )
          .in("role", ["creator", "pending_creator", "escort"]);
        if (baseData) creatorUsers = [...baseData];
      }
    } catch {}

    const creatorUserIds = new Set(creatorUsers.map((u) => u.uid));

    // Ensure selected verified creators and verified users are always included even if their database role was 'subscriber'
    try {
      const { data: selectedUsers } = await supabase
        .from("users")
        .select(
          "uid, name, email, avatar, role, phone, created_at, cover_image, status, kyc_status, is_verified, gender, gender_description, dob",
        )
        .or(
          "is_verified.eq.true,kyc_status.eq.verified,email.eq.hadq@gmail.com,email.eq.nataliangina62@gmail.com,email.eq.ellarains00@gmail.com,email.eq.nimoblip@gmail.com",
        );
      if (selectedUsers) {
        selectedUsers.forEach((su) => {
          if (!creatorUserIds.has(su.uid)) {
            creatorUsers.push(su);
            creatorUserIds.add(su.uid);
          }
        });
      }
    } catch {}

    const fatmaLoki = {
      uid: "347f9665-49b7-4458-9ef2-457e19d60a80",
      name: "Fatma Loki",
      email: "hadq@gmail.com",
    };
    if (!creatorUserIds.has(fatmaLoki.uid)) {
      const local = getStoredCreatorProfile(fatmaLoki.uid);
      creatorUsers.push({
        ...fatmaLoki,
        avatar: local?.avatar || null,
        cover_image: local?.cover_image || null,
        role: "creator",
        created_at: local?.created_at || null,
      });
      creatorUserIds.add(fatmaLoki.uid);
    }

    const postingUidsToFetch = Array.from(postsByCreator.keys()).filter(
      (id) =>
        !creatorUserIds.has(id) &&
        !id.startsWith("creator-") &&
        !id.startsWith("escort-"),
    );
    if (postingUidsToFetch.length > 0) {
      try {
        const { data: postingUsers } = await supabase
          .from("users")
          .select(
            "uid, name, email, avatar, role, phone, created_at, cover_image, status, kyc_status, is_verified, payout_kyc_required, gender, gender_description, dob",
          )
          .in("uid", postingUidsToFetch);
        if (postingUsers) {
          postingUsers.forEach((u) => {
            if (!creatorUserIds.has(u.uid)) {
              creatorUsers.push(u);
              creatorUserIds.add(u.uid);
            }
          });
        }
      } catch {}
    }

    // 2.1 CRITICAL: If RLS on 'users' blocked querying other creators, ensure all creators who posted are retained!
    for (const cid of postingUidsToFetch) {
      if (!creatorUserIds.has(cid)) {
        const local = getStoredCreatorProfile(cid);
        creatorUsers.push({
          uid: cid,
          name:
            local?.name ||
            local?.display_name ||
            (cid === "b3bdd443-103e-45cb-986b-1d3d32659b3a"
              ? "Joy Mwangi"
              : "VIP Creator"),
          avatar: local?.avatar || null,
          role: "creator",
          created_at:
            postsByCreator.get(cid)?.latestDate || new Date().toISOString(),
        });
        creatorUserIds.add(cid);
      }
    }

    // 3. Fetch creator profiles for metadata (pricing, bio, tags, cover)
    const profileMap = new Map<string, any>();
    try {
      const { data: profiles } = await supabase
        .from("creator_profiles")
        .select("*");
      if (profiles && profiles.length > 0) {
        // Collect user_ids missing from creatorUsers to fetch their real profile from 'users'
        const missingUserIds = profiles
          .map((p) => p.user_id)
          .filter((uid) => uid && !creatorUserIds.has(uid));

        const fetchedUsersMap = new Map<string, any>();
        if (missingUserIds.length > 0) {
          try {
            const { data: userRows } = await supabase
              .from("users")
              .select(
                "uid, name, email, avatar, role, phone, created_at, cover_image, status, kyc_status, is_verified, payout_kyc_required, gender, gender_description, dob",
              )
              .in("uid", missingUserIds);
            (userRows || []).forEach((ur) => fetchedUsersMap.set(ur.uid, ur));
          } catch {}
        }

        profiles.forEach((p) => {
          profileMap.set(p.user_id, p);
          if (!creatorUserIds.has(p.user_id)) {
            const matchedUser = fetchedUsersMap.get(p.user_id);
            const resolvedName = resolveCreatorDisplayName(
              matchedUser?.name,
              p.display_name,
              p.name,
              matchedUser?.email?.split("@")[0],
            );

            creatorUsers.push({
              uid: p.user_id,
              name: resolvedName,
              avatar: matchedUser?.avatar || p.avatar_url || p.avatar || null,
              cover_image: matchedUser?.cover_image || p.cover_image || null,
              role: matchedUser?.role || "creator",
              kyc_status: matchedUser?.kyc_status || p.kyc_status,
              is_verified: matchedUser?.is_verified || p.is_verified,
              payout_kyc_required: matchedUser?.payout_kyc_required || false,
              gender: matchedUser?.gender || p.gender,
              gender_description:
                matchedUser?.gender_description || p.gender_description,
              dob: matchedUser?.dob || p.dob,
              created_at:
                p.created_at ||
                matchedUser?.created_at ||
                new Date().toISOString(),
            });
            creatorUserIds.add(p.user_id);

            // Sync display_name in database if null so future reads are instantaneous
            if (matchedUser?.name && !p.display_name) {
              supabase
                .from("creator_profiles")
                .update({ display_name: matchedUser.name })
                .eq("user_id", p.user_id)
                .then(
                  () => {},
                  () => {},
                );
            }
          }
        });
      }
    } catch (err) {
      console.warn("Could not fetch all creator_profiles:", err);
    }

    // Also check local storage cached creator profiles
    const localCreatorProfiles: Array<{ uid: string; profile: any }> = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("tgd_creator_profile_")) {
          const uid = key.replace("tgd_creator_profile_", "");
          const localProf = JSON.parse(localStorage.getItem(key) || "{}");
          localCreatorProfiles.push({ uid, profile: localProf });
          const existing = profileMap.get(uid);
          if (!existing) {
            profileMap.set(uid, localProf);
          } else {
            // Merge uploaded cover/avatar if DB record still holds placeholder
            const merged = { ...existing };
            if (
              hasUploadedCoverPhoto(localProf.cover_image) &&
              !hasUploadedCoverPhoto(existing.cover_image)
            ) {
              merged.cover_image = localProf.cover_image;
            }
            if (
              hasUploadedProfilePhoto(localProf.avatar) &&
              !hasUploadedProfilePhoto(existing.avatar)
            ) {
              merged.avatar = localProf.avatar;
              merged.avatar_url = localProf.avatar;
            }
            profileMap.set(uid, merged);
          }
        }
      }
    } catch {}
    creatorUsers = addLocalCreatorCandidates(
      creatorUsers,
      localCreatorProfiles,
    );

    // CRITICAL: Ensure NO creator displays as "VIP Creator" when their real account name exists in 'users'
    const genericUids = creatorUsers
      .filter(
        (u) =>
          !u.name || GENERIC_CREATOR_NAMES.has(u.name.trim().toLowerCase()),
      )
      .map((u) => u.uid);

    if (genericUids.length > 0) {
      try {
        const { data: realUsers } = await supabase
          .from("users")
          .select("uid, name, avatar, cover_image")
          .in("uid", genericUids);

        if (realUsers && realUsers.length > 0) {
          const realUserMap = new Map(realUsers.map((ru) => [ru.uid, ru]));
          creatorUsers.forEach((u) => {
            const ru = realUserMap.get(u.uid);
            if (
              ru?.name &&
              !GENERIC_CREATOR_NAMES.has(ru.name.trim().toLowerCase())
            ) {
              u.name = ru.name;
            }
            if (ru?.avatar && !u.avatar) {
              u.avatar = ru.avatar;
            }
            if (ru?.cover_image && !u.cover_image) {
              u.cover_image = ru.cover_image;
            }
          });
        }
      } catch (err) {
        console.warn("Could not backfill real user names for creators:", err);
      }
    }

    // Query active subscriptions count per creator for live accurate subscriber stats
    let activeSubsQueriedSuccessfully = false;
    const creatorSubCounts = new Map<string, number>();
    try {
      const { data: activeSubs, error } = await supabase
        .from("subscriptions")
        .select("creator_id")
        .eq("status", "active");
      if (!error && activeSubs) {
        activeSubsQueriedSuccessfully = true;
        activeSubs.forEach((s: any) => {
          if (s.creator_id) {
            creatorSubCounts.set(
              s.creator_id,
              (creatorSubCounts.get(s.creator_id) || 0) + 1,
            );
          }
        });
      }
    } catch (err) {
      console.warn(
        "Could not query active subscriptions in getDiscoverCreators:",
        err,
      );
    }

    const deletedCreatorIds =
      typeof window !== "undefined"
        ? new Set(
            JSON.parse(localStorage.getItem("tgd_deleted_creator_ids") || "[]"),
          )
        : new Set();

    // Filter out any suspended, banned, or deleted creators from public discovery
    const activeCreatorUsers = creatorUsers.filter((u) => {
      if (deletedCreatorIds.has(u.uid) || deletedCreatorIds.has((u as any).id))
        return false;
      const p = profileMap.get(u.uid);
      const isSuspended =
        u.status === "suspended" ||
        u.status === "banned" ||
        u.role === "suspended_creator" ||
        p?.status === "suspended" ||
        (typeof window !== "undefined" &&
          localStorage.getItem(`tgd_user_status_${u.uid}`) === "suspended");
      return !isSuspended;
    });

    // Format all real creators with resilient storage assets
    const realCreators = await Promise.all(
      activeCreatorUsers.map(async (u) => {
        const p = profileMap.get(u.uid);
        const postStats = postsByCreator.get(u.uid);
        const hasPosts = (postStats?.count || 0) > 0;
        const local = getStoredCreatorProfile(u.uid);

        // Storage assets check for missing avatar or cover
        const hasKnownCover =
          hasUploadedCoverPhoto(p?.cover_image) ||
          hasUploadedCoverPhoto(u.cover_image) ||
          hasUploadedCoverPhoto(local?.cover_image);
        const hasKnownAvatar =
          hasUploadedProfilePhoto(u.avatar) ||
          hasUploadedProfilePhoto(p?.avatar) ||
          hasUploadedProfilePhoto(p?.avatar_url) ||
          hasUploadedProfilePhoto(local?.avatar);

        let storageAssets = {
          avatar: null as string | null,
          cover: null as string | null,
        };
        if (!hasKnownAvatar || !hasKnownCover) {
          storageAssets = await getCreatorStorageAssets(u.uid);
        }

        const creatorName = resolveCreatorDisplayName(
          u.name,
          p?.display_name,
          p?.name,
          local?.name,
          local?.display_name,
          u.uid === "b3bdd443-103e-45cb-986b-1d3d32659b3a"
            ? "Joy Mwangi"
            : null,
        );
        const rawAvatar =
          u.avatar ||
          p?.avatar_url ||
          p?.avatar ||
          local?.avatar ||
          local?.avatar_url ||
          storageAssets.avatar;
        const avatar = resolveUserAvatar(
          rawAvatar && !rawAvatar.startsWith("blob:") ? rawAvatar : null,
          creatorName,
        );

        const pCover =
          p?.cover_image &&
          hasUploadedCoverPhoto(p.cover_image) &&
          !isVideoMediaUrl(p.cover_image)
            ? p.cover_image
            : null;
        const uCover =
          u.cover_image &&
          hasUploadedCoverPhoto(u.cover_image) &&
          !isVideoMediaUrl(u.cover_image)
            ? u.cover_image
            : null;
        const localCover =
          local?.cover_image &&
          hasUploadedCoverPhoto(local.cover_image) &&
          !isVideoMediaUrl(local.cover_image)
            ? local.cover_image
            : null;
        const storageCover =
          storageAssets.cover &&
          hasUploadedCoverPhoto(storageAssets.cover) &&
          !isVideoMediaUrl(storageAssets.cover)
            ? storageAssets.cover
            : null;
        const postCover =
          postStats?.latestCover &&
          hasUploadedCoverPhoto(postStats.latestCover) &&
          !isVideoMediaUrl(postStats.latestCover)
            ? postStats.latestCover
            : null;

        const rawCover =
          pCover || uCover || localCover || storageCover || postCover;
        const cover = rawCover || "/default-cover.jpg";
        const isTargetUnverified = isUnverifiedDiscoverUser(
          creatorName,
          (u as any).email,
          u.uid,
        );
        const isSelectedCreator =
          !isTargetUnverified &&
          isSelectedVerifiedCreator(creatorName, (u as any).email, u.uid);
        const isDiscoverFeatured =
          isSelectedCreator ||
          isTargetUnverified ||
          Boolean(u.payout_kyc_required);

        // Self-heal: persist resolved cover back to DB in background if not yet set
        if (rawCover && hasUploadedCoverPhoto(rawCover)) {
          if (!hasUploadedCoverPhoto(u.cover_image)) {
            supabase
              .from("users")
              .update({ cover_image: rawCover })
              .eq("uid", u.uid)
              .then(
                () => {},
                () => {},
              );
          }
          if (!hasUploadedCoverPhoto(p?.cover_image)) {
            supabase
              .from("creator_profiles")
              .update({ cover_image: rawCover })
              .eq("user_id", u.uid)
              .then(
                () => {},
                () => {},
              );
          }
        }

        const realSubs = creatorSubCounts.has(u.uid)
          ? creatorSubCounts.get(u.uid) || 0
          : activeSubsQueriedSuccessfully
            ? 0
            : p?.total_subscribers || 0;
        const profileDob = u.dob || p?.dob || local?.dob;
        const profileAge = profileDob ? calculateAge(String(profileDob)) : null;
        const rawGender = u.gender || p?.gender || local?.gender;
        let publicGender = getPublicGenderLabel(
          rawGender,
          u.gender_description ||
            p?.gender_description ||
            local?.gender_description,
        );

        // Handle gender mapping and preserve proper category for discover filters
        if (
          creatorName.toLowerCase().includes("sir collo") ||
          creatorName.toLowerCase().includes("david kimani") ||
          (u as any)?.email === "sircollo51@gmail.com" ||
          (u as any)?.email === "executivehideawaybarberandspa@gmail.com" ||
          publicGender?.toLowerCase() === "man" ||
          publicGender?.toLowerCase() === "male"
        ) {
          publicGender = "Man";
        } else if (
          !publicGender ||
          (publicGender.toLowerCase() !== "man" &&
            publicGender.toLowerCase() !== "male")
        ) {
          publicGender = "Woman";
        }

        return {
          id: u.uid,
          name: creatorName,
          handle: `@${creatorName.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
          category:
            p?.niche ||
            (p?.tags && p.tags[0]) ||
            (hasPosts ? "Active Feed Creator" : "VIP Creator"),
          location: p?.location || "Nairobi, Kenya",
          age: profileAge ?? local?.age ?? p?.age ?? null,
          gender: publicGender,
          subs: `${realSubs} ${realSubs === 1 ? "subscriber" : "subscribers"}`,
          subscribersCount: realSubs,
          price: `KES ${(p?.monthly_price || 1000).toLocaleString()}/mo`,
          avatar,
          cover,
          hasPosts,
          last_seen:
            (u as any).last_seen ||
            (local as any)?.last_seen ||
            getUserLastSeen(u.uid) ||
            null,
          isVerified:
            !isTargetUnverified &&
            (isSelectedCreator ||
              isCreatorVerified(
                u.uid,
                (u as any).is_verified ??
                  p?.is_verified ??
                  (local as any)?.is_verified,
                (u as any).kyc_status ||
                  p?.kyc_status ||
                  (local as any)?.kyc_status,
              )),
          isDiscoverFeatured,
          postsCount: postStats?.count || 0,
          createdAt:
            postStats?.latestDate || u.created_at || new Date().toISOString(),
        };
      }),
    );

    // Include active creator accounts even when they are unverified or have incomplete profiles.
    const discoverableRealCreators = realCreators;

    // Sort: creators with active posts come first
    discoverableRealCreators.sort((a, b) => {
      if (a.hasPosts !== b.hasPosts) return a.hasPosts ? -1 : 1;
      return (b.postsCount || 0) - (a.postsCount || 0);
    });

    // Real registered creators first, followed by strictly 2 sample demo accounts clearly tagged
    const existingIds = new Set(discoverableRealCreators.map((c) => c.id));
    const combined: any[] = [...discoverableRealCreators];

    HARDCODED_DISCOVER_CREATORS.slice(0, 2).forEach((demo) => {
      if (
        !deletedCreatorIds.has(demo.id) &&
        !existingIds.has(demo.id) &&
        hasUploadedProfilePhoto(demo.avatar) &&
        hasUploadedCoverPhoto(demo.cover)
      ) {
        combined.push({
          ...demo,
          isVerified: Boolean(demo.isVerified),
          isDemo: true,
        });
        existingIds.add(demo.id);
      }
    });

    return combined;
  } catch (err) {
    console.error("getDiscoverCreators error:", err);
    return [];
  }
};

export const getCreatorDashboardStats = async (creatorId: string) => {
  // Get all completed net transactions (earnings)
  const { data: txs } = await supabase
    .from("transactions")
    .select("net_amount, type")
    .eq("to_creator_id", creatorId)
    .eq("status", "completed")
    .neq("type", "payout");

  const totalEarnings = (txs || []).reduce(
    (sum, t) => sum + (t.net_amount || 0),
    0,
  );

  // Get active subscribers count
  const { count: activeSubs } = await supabase
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", creatorId)
    .eq("status", "active");

  // Get recent subscribers (last 5)
  const { data: recentSubs } = await supabase
    .from("transactions")
    .select("*, users!from_user_id(name, avatar)")
    .eq("to_creator_id", creatorId)
    .eq("type", "subscription")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(5);

  return {
    totalEarnings,
    activeSubs: activeSubs || 0,
    recentSubs: recentSubs || [],
  };
};

export const getCreatorStats = getCreatorDashboardStats;

export const checkEmailExists = async (email: string) => {
  const { data, error } = await supabase
    .from("users")
    .select("email")
    .ilike("email", email)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("Error checking email:", error);
  }

  return !!data;
};

// ========================
// 6. ADMIN SYSTEM
// ========================

export const getAdminOverviewStats = async () => {
  try {
    const { count: usersCount } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });
    const { count: creatorsCount } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .in("role", ["creator", "pending_creator"]);
    const { count: fansCount } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .in("role", ["subscriber", "fan"]);
    const { count: pendingEscortApps } = await supabase
      .from("escort_applications")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    let pendingKycCount = 0;
    try {
      const { count: kycCount } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("kyc_status", "pending");
      pendingKycCount = kycCount || 0;
    } catch {}

    // Sum transactions for total revenue (exclude payout/withdrawal rows)
    const { data: txs } = await supabase
      .from("transactions")
      .select("gross_amount, platform_fee, status, created_at, type")
      .eq("status", "completed")
      .neq("type", "payout");
    const totalRevenue = (txs || []).reduce(
      (sum, t) => sum + (t.gross_amount || 0),
      0,
    );
    const platformFees =
      (txs || []).reduce((sum, t) => sum + (t.platform_fee || 0), 0) ||
      Math.round(totalRevenue * PLATFORM_FEE);

    // Calculate revenue trend for past 7 days
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();
    (txs || []).forEach((t) => {
      if (t.created_at) {
        const d = new Date(t.created_at);
        const diffDays = Math.floor(
          (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (diffDays >= 0 && diffDays < 7) {
          dayCounts[6 - diffDays] += t.gross_amount || 0;
        }
      }
    });

    return {
      totalUsers: usersCount || 0,
      totalCreators: creatorsCount || 0,
      totalFans:
        fansCount ||
        (usersCount ? Math.max(0, usersCount - (creatorsCount || 0)) : 0),
      totalRevenue: totalRevenue,
      platformFees: platformFees,
      pendingReviews: (pendingEscortApps || 0) + pendingKycCount,
      revenueHistory: dayCounts,
    };
  } catch (e) {
    return {
      totalUsers: 0,
      totalCreators: 0,
      totalFans: 0,
      totalRevenue: 0,
      platformFees: 0,
      pendingReviews: 0,
      revenueHistory: [0, 0, 0, 0, 0, 0, 0],
    };
  }
};

export const getAdminCreators = async () => {
  try {
    // 1. Fetch creators explicitly marked with creator/escort roles
    let creatorUsers: any[] = [];
    try {
      const { data: byRole } = await supabase
        .from("users")
        .select("*")
        .in("role", [
          "creator",
          "pending_creator",
          "suspended_creator",
          "escort",
        ]);
      if (byRole) creatorUsers = [...byRole];
    } catch (e) {
      console.warn("Error querying creator users by role:", e);
    }

    const creatorUids = new Set<string>(creatorUsers.map((u) => u.uid));

    // 2. Fetch all creator_profiles to catch any creator registered via profile
    try {
      const { data: profiles } = await supabase
        .from("creator_profiles")
        .select("user_id, display_name, avatar_url, avatar, created_at");

      const missingUids = (profiles || [])
        .map((p) => p.user_id)
        .filter((id) => id && !creatorUids.has(id));

      if (missingUids.length > 0) {
        const { data: extraUsers } = await supabase
          .from("users")
          .select("*")
          .in("uid", missingUids);

        if (extraUsers) {
          extraUsers.forEach((u) => {
            if (!creatorUids.has(u.uid)) {
              creatorUsers.push(u);
              creatorUids.add(u.uid);
            }
          });
        }

        // For any profile still not in users table, synthesize candidate
        (profiles || []).forEach((p) => {
          if (p.user_id && !creatorUids.has(p.user_id)) {
            creatorUsers.push({
              uid: p.user_id,
              name: p.display_name || "Creator",
              email: "No email",
              avatar: p.avatar_url || p.avatar || null,
              role: "creator",
              created_at: p.created_at || new Date().toISOString(),
            });
            creatorUids.add(p.user_id);
          }
        });
      }
    } catch (err) {
      console.warn("Error checking creator_profiles in getAdminCreators:", err);
    }

    // 3. Fetch creators who have actually uploaded posts on the platform
    try {
      const { data: posts } = await supabase.from("posts").select("creator_id");

      const postingUids = Array.from(
        new Set((posts || []).map((p) => p.creator_id)),
      ).filter(
        (id) =>
          id &&
          !creatorUids.has(id) &&
          !id.startsWith("creator-") &&
          !id.startsWith("escort-"),
      );

      if (postingUids.length > 0) {
        const { data: postingUsers } = await supabase
          .from("users")
          .select("*")
          .in("uid", postingUids);

        if (postingUsers) {
          postingUsers.forEach((u) => {
            if (!creatorUids.has(u.uid)) {
              creatorUsers.push(u);
              creatorUids.add(u.uid);
            }
          });
        }
      }
    } catch {}

    // 4. Check local storage for any recently created creator profiles
    if (typeof window !== "undefined") {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("tgd_creator_profile_")) {
            const uid = key.replace("tgd_creator_profile_", "");
            if (!creatorUids.has(uid)) {
              const localProf = JSON.parse(localStorage.getItem(key) || "{}");
              creatorUsers.push({
                uid,
                name: localProf.name || localProf.display_name || "Creator",
                email: "No email",
                avatar: localProf.avatar || localProf.avatar_url || null,
                role: "creator",
                created_at: new Date().toISOString(),
              });
              creatorUids.add(uid);
            }
          }
        }
      } catch {}
    }

    // Filter out permanently deleted creators
    const deletedIds =
      typeof window !== "undefined"
        ? new Set(
            JSON.parse(localStorage.getItem("tgd_deleted_creator_ids") || "[]"),
          )
        : new Set();

    creatorUsers = creatorUsers.filter(
      (u) => !deletedIds.has(u.uid) && !deletedIds.has((u as any).id),
    );

    // Auto-sync: Ensure any users identified as creators have role = 'creator' in database
    const syncUids = creatorUsers
      .filter(
        (u) =>
          u.role !== "creator" &&
          u.role !== "suspended_creator" &&
          u.role !== "pending_creator",
      )
      .map((u) => u.uid);
    if (syncUids.length > 0) {
      supabase
        .from("users")
        .update({ role: "creator" })
        .in("uid", syncUids)
        .then(
          () => {},
          () => {},
        );
    }

    const uids = creatorUsers.map((u) => u.uid);
    const { data: profiles } =
      uids.length > 0
        ? await supabase
            .from("creator_profiles")
            .select("*")
            .in("user_id", uids)
        : { data: [] };

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

    return creatorUsers.map((u) => {
      const p = profileMap.get(u.uid);
      const local = getStoredCreatorProfile(u.uid);
      const name =
        u.name ||
        p?.display_name ||
        local?.name ||
        local?.display_name ||
        "Creator";
      const avatar =
        u.avatar ||
        p?.avatar_url ||
        p?.avatar ||
        local?.avatar ||
        local?.avatar_url ||
        null;
      const coverUrl =
        p?.cover_image ||
        (u as any).cover_image ||
        (local as any)?.cover_image ||
        null;
      const idDocUrl =
        (u as any).kyc_id_url ||
        p?.kyc_id_url ||
        (local as any)?.kyc_id_url ||
        (local as any)?.idDocument ||
        null;
      const selfieUrl =
        (u as any).kyc_selfie_url ||
        p?.kyc_selfie_url ||
        (local as any)?.kyc_selfie_url ||
        (local as any)?.selfie ||
        null;
      const legalName =
        (u as any).legal_name ||
        p?.legal_name ||
        (local as any)?.legalName ||
        (local as any)?.legal_name ||
        null;
      const nationalId =
        (u as any).national_id_number ||
        p?.national_id_number ||
        (local as any)?.nationalId ||
        (local as any)?.national_id_number ||
        null;
      const dob = (u as any).dob || p?.dob || (local as any)?.dob || null;
      const hasId = Boolean(idDocUrl);
      const hasSelfie = Boolean(selfieUrl);
      const kycStatus =
        (u as any).kyc_status ||
        p?.kyc_status ||
        (local as any)?.kyc_status ||
        (hasId ? "pending" : "unverified");
      const isTargetUnverified = isUnverifiedDiscoverUser(
        name,
        (u as any).email,
        u.uid,
      );
      const isVerified =
        !isTargetUnverified &&
        (isSelectedVerifiedCreator(name, (u as any).email, u.uid) ||
          isCreatorVerified(
            u.uid,
            (u as any).is_verified ??
              p?.is_verified ??
              (local as any)?.is_verified,
            kycStatus,
          ));

      // Auto-sync locally stored KYC details to public.users if DB row was missing them
      if (
        (idDocUrl || selfieUrl) &&
        (!(u as any).kyc_id_url || !(u as any).kyc_selfie_url)
      ) {
        supabase
          .from("users")
          .update({
            ...(legalName ? { legal_name: legalName } : {}),
            ...(nationalId ? { national_id_number: nationalId } : {}),
            ...(dob ? { dob } : {}),
            ...(idDocUrl ? { kyc_id_url: idDocUrl } : {}),
            ...(selfieUrl ? { kyc_selfie_url: selfieUrl } : {}),
            kyc_status: kycStatus === "verified" ? "verified" : "pending",
          })
          .eq("uid", u.uid)
          .then(
            () => {},
            () => {},
          );
      }

      const localStatus =
        typeof window !== "undefined"
          ? localStorage.getItem(`tgd_user_status_${u.uid}`)
          : null;
      const status =
        localStatus === "suspended"
          ? "suspended"
          : localStatus === "active"
            ? "active"
            : localStatus === "pending"
              ? "pending"
              : u.status === "suspended" ||
                  u.role === "suspended_creator" ||
                  p?.status === "suspended"
                ? "suspended"
                : u.status === "pending" || u.role === "pending_creator"
                  ? "pending"
                  : "active";

      return {
        id: u.uid,
        name,
        email: u.email || "No email",
        phone: (u as any).phone || (local as any)?.phone || null,
        img: resolveUserAvatar(avatar, name),
        coverUrl,
        category:
          p?.niche || local?.category || (p?.tags && p.tags[0]) || "Various",
        subs: p?.total_subscribers || local?.total_subscribers || 0,
        revenue: `KES ${(p?.total_earnings || 0).toLocaleString()}`,
        status,
        joined: u.created_at
          ? new Date(u.created_at).toLocaleDateString("en-KE", {
              month: "short",
              year: "numeric",
            })
          : "Recent",
        hasId,
        hasSelfie,
        idDocUrl,
        selfieUrl,
        legalName,
        nationalId,
        dob,
        isVerified,
        kycStatus,
        last_seen:
          (u as any).last_seen ||
          (local as any)?.last_seen ||
          getUserLastSeen(u.uid) ||
          null,
      };
    });
  } catch (err) {
    console.error("Error fetching admin creators:", err);
    return [];
  }
};

export const setCreatorVerified = async (
  creatorId: string,
  verified: boolean,
): Promise<boolean> => {
  if (!creatorId) throw new Error("Creator ID is required.");

  const { data: creator, error: lookupError } = await supabase
    .from("users")
    .select("*")
    .eq("uid", creatorId)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!creator) throw new Error("Creator account was not found.");

  const local = getStoredCreatorProfile(creatorId);
  const { data: creatorProfile, error: profileLookupError } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("user_id", creatorId)
    .maybeSingle();
  if (profileLookupError) throw profileLookupError;

  const hasId = Boolean(
    creator?.kyc_id_url ||
    creatorProfile?.kyc_id_url ||
    (local as any)?.kyc_id_url ||
    (local as any)?.idDocument,
  );
  const hasSelfie = Boolean(
    creator?.kyc_selfie_url ||
    creatorProfile?.kyc_selfie_url ||
    (local as any)?.kyc_selfie_url ||
    (local as any)?.selfie,
  );
  const hasKycSubmitted = Boolean(
    (hasId && hasSelfie) ||
    creator?.kyc_status === "pending" ||
    creatorProfile?.kyc_status === "pending" ||
    (local as any)?.kyc_status === "pending" ||
    creator?.kyc_status === "verified" ||
    (local as any)?.kyc_status === "verified",
  );

  if (verified && !hasKycSubmitted) {
    throw new Error(
      "The creator must submit their identity details, ID document, and selfie before verification.",
    );
  }

  const targetStatus = verified ? "verified" : "rejected";
  const { users, creatorProfiles } =
    resolveCreatorVerificationPayloads(targetStatus);

  const { error: updateError } = await supabase
    .from("users")
    .update(users)
    .eq("uid", creatorId);

  if (updateError) throw updateError;

  const { error: profileUpdateError } = await supabase
    .from("creator_profiles")
    .upsert(
      { user_id: creatorId, ...creatorProfiles },
      { onConflict: "user_id" },
    );
  if (profileUpdateError) throw profileUpdateError;

  if (typeof window !== "undefined") {
    try {
      const existingLocal = getStoredCreatorProfile(creatorId) || {};
      localStorage.setItem(
        `tgd_creator_profile_${creatorId}`,
        JSON.stringify({
          ...existingLocal,
          ...creatorProfiles,
        }),
      );

      const verifiedIds = new Set(
        JSON.parse(localStorage.getItem("tgd_verified_creator_ids") || "[]"),
      );
      if (verified) {
        verifiedIds.add(creatorId);
      } else {
        verifiedIds.delete(creatorId);
      }
      localStorage.setItem(
        "tgd_verified_creator_ids",
        JSON.stringify(Array.from(verifiedIds)),
      );
    } catch (error) {
      console.warn("Could not update local creator verification cache:", error);
    }

    window.dispatchEvent(new CustomEvent("creators_updated"));
    window.dispatchEvent(new CustomEvent("posts_updated"));
  }

  if (verified) {
    createNotification(creatorId, {
      title: "Identity Verification Approved! 👑",
      message:
        "Congratulations! Your KYC identity documents have been approved by the admin. Your profile now displays the official Blue Verified Badge.",
      type: "system",
      badge: "Verified",
      link: "/dashboard",
      action_label: "View Dashboard",
      action_url: "/dashboard",
    }).catch(() => {});
  }

  return true;
};

export interface CreatorApplicationItem {
  id: string;
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  legalName?: string;
  nationalId?: string;
  dob?: string;
  avatar?: string;
  coverImage?: string;
  bio?: string;
  role: string;
  status: string;
  kycStatus: "pending" | "verified" | "rejected" | "none";
  idDocUrl?: string | null;
  selfieUrl?: string | null;
  createdAt: string;
  hasBothDocs: boolean;
  category?: string;
  isVip?: boolean;
}

export const resolveStorageDocUrl = async (
  rawUrl: string | null | undefined,
): Promise<string | null> => {
  if (!rawUrl) return null;
  if (
    rawUrl.startsWith("http://") ||
    rawUrl.startsWith("https://") ||
    rawUrl.startsWith("data:")
  ) {
    return rawUrl;
  }
  const cleanPath = rawUrl
    .replace(/^kyc-documents\//, "")
    .replace(/^kyc\//, "");
  try {
    const { data, error } = await supabase.storage
      .from("kyc-documents")
      .createSignedUrl(cleanPath, 60 * 60);
    if (error) {
      const { data: pubData } = supabase.storage
        .from("kyc-documents")
        .getPublicUrl(cleanPath);
      return pubData?.publicUrl || null;
    }
    return data?.signedUrl || null;
  } catch {
    const { data: pubData } = supabase.storage
      .from("kyc-documents")
      .getPublicUrl(cleanPath);
    return pubData?.publicUrl || null;
  }
};

export const getAdminApplications = async (): Promise<
  CreatorApplicationItem[]
> => {
  try {
    const [usersRes, profilesRes] = await Promise.all([
      supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("creator_profiles").select("*"),
    ]);

    const users = usersRes.data;
    const usersErr = usersRes.error;
    const profiles = profilesRes.data;

    if (usersErr) throw usersErr;

    const profileMap = new Map<string, any>();
    if (Array.isArray(profiles)) {
      profiles.forEach((p: any) => {
        if (p?.user_id) profileMap.set(p.user_id, p);
      });
    }

    const applicationMap = new Map<string, any>();

    // 1. Process DB users
    (users || []).forEach((u: any) => {
      const p = profileMap.get(u.uid || u.id);
      const isPendingKyc =
        u.kyc_status === "pending" || p?.kyc_status === "pending";
      const isPendingRole = u.role === "pending_creator";
      const hasIdOrSelfie = Boolean(
        u.kyc_id_url || u.kyc_selfie_url || p?.kyc_id_url || p?.kyc_selfie_url,
      );
      const isUnverified =
        u.kyc_status !== "verified" && p?.kyc_status !== "verified";

      if (isPendingKyc || isPendingRole || (hasIdOrSelfie && isUnverified)) {
        const uid = u.uid || u.id;
        applicationMap.set(uid, {
          id: uid,
          uid,
          name: u.name || p?.display_name || "Creator Applicant",
          email: u.email,
          phone: u.phone,
          legalName: u.legal_name || p?.legal_name || "",
          nationalId: u.national_id_number || p?.national_id || "",
          dob: u.dob || p?.dob || "",
          avatar: u.avatar || p?.avatar_url,
          coverImage: u.cover_image || p?.cover_url,
          bio: u.bio || p?.bio || "",
          role: u.role || "pending_creator",
          status: u.status || "pending",
          kycStatus: (u.kyc_status || p?.kyc_status || "pending") as any,
          idDocUrl: u.kyc_id_url || p?.kyc_id_url || null,
          selfieUrl: u.kyc_selfie_url || p?.kyc_selfie_url || null,
          createdAt: u.created_at || new Date().toISOString(),
          category: p?.category || p?.niche || "Digital Creator",
          isVip: Boolean(p?.is_featured || p?.niche === "VIP Creator"),
        });
      }
    });

    // 2. Merge local storage backups (tgd_creator_profile_* and pending_creator_kyc)
    if (typeof window !== "undefined") {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("tgd_creator_profile_")) {
            const uid = key.replace("tgd_creator_profile_", "");
            const local = JSON.parse(localStorage.getItem(key) || "{}");
            const isPending =
              local.kyc_status === "pending" ||
              local.role === "pending_creator";
            const hasDocs = Boolean(
              local.kyc_id_url ||
              local.kyc_selfie_url ||
              local.idDocument ||
              local.selfie,
            );

            if ((isPending || hasDocs) && local.kyc_status !== "verified") {
              const existing = applicationMap.get(uid);
              if (existing) {
                if (
                  !existing.idDocUrl &&
                  (local.kyc_id_url || local.idDocument)
                )
                  existing.idDocUrl = local.kyc_id_url || local.idDocument;
                if (
                  !existing.selfieUrl &&
                  (local.kyc_selfie_url || local.selfie)
                )
                  existing.selfieUrl = local.kyc_selfie_url || local.selfie;
                if (!existing.legalName && local.legalName)
                  existing.legalName = local.legalName;
                if (!existing.nationalId && local.nationalId)
                  existing.nationalId = local.nationalId;
                if (!existing.dob && local.dob) existing.dob = local.dob;
                if (
                  !existing.coverImage &&
                  (local.cover_url || local.coverImage)
                )
                  existing.coverImage = local.cover_url || local.coverImage;
              } else {
                applicationMap.set(uid, {
                  id: uid,
                  uid,
                  name: local.name || local.display_name || "Creator Applicant",
                  email: local.email,
                  phone: local.phone,
                  legalName: local.legalName || "",
                  nationalId: local.nationalId || "",
                  dob: local.dob || "",
                  avatar: local.avatar,
                  coverImage: local.cover_url || local.coverImage,
                  bio: local.bio || "",
                  role: local.role || "pending_creator",
                  status: local.status || "pending",
                  kycStatus: (local.kyc_status || "pending") as any,
                  idDocUrl: local.kyc_id_url || local.idDocument || null,
                  selfieUrl: local.kyc_selfie_url || local.selfie || null,
                  createdAt: new Date().toISOString(),
                  category: local.category || local.niche || "Digital Creator",
                  isVip: Boolean(local.is_vip || local.is_featured),
                });
              }
            }
          }
        }

        const pendingQueue = JSON.parse(
          localStorage.getItem("pending_creator_kyc") || "[]",
        );
        if (Array.isArray(pendingQueue)) {
          for (const item of pendingQueue) {
            if (!item?.uid) continue;
            const existing = applicationMap.get(item.uid);
            if (existing) {
              if (!existing.idDocUrl && item.kyc_id_url)
                existing.idDocUrl = item.kyc_id_url;
              if (!existing.selfieUrl && item.kyc_selfie_url)
                existing.selfieUrl = item.kyc_selfie_url;
              if (!existing.legalName && item.legal_name)
                existing.legalName = item.legal_name;
              if (!existing.nationalId && item.national_id)
                existing.nationalId = item.national_id;
              if (!existing.dob && item.dob) existing.dob = item.dob;
            } else {
              applicationMap.set(item.uid, {
                id: item.uid,
                uid: item.uid,
                name: item.display_name || "Creator Applicant",
                email: item.email,
                phone: item.phone,
                legalName: item.legal_name || "",
                nationalId: item.national_id || "",
                dob: item.dob || "",
                avatar: item.avatar_url,
                coverImage: item.cover_url,
                bio: item.bio || "",
                role: "pending_creator",
                status: "pending",
                kycStatus: "pending",
                idDocUrl: item.kyc_id_url || null,
                selfieUrl: item.kyc_selfie_url || null,
                createdAt: item.submitted_at || new Date().toISOString(),
                category: "Digital Creator",
                isVip: false,
              });
            }
          }
        }
      } catch (err) {
        console.warn("Local application queue resolution notice:", err);
      }
    }

    const rawList = Array.from(applicationMap.values());

    // 3. Resolve document URLs in parallel
    const resolvedList: CreatorApplicationItem[] = await Promise.all(
      rawList.map(async (app) => {
        const [idDocUrl, selfieUrl] = await Promise.all([
          resolveStorageDocUrl(app.idDocUrl),
          resolveStorageDocUrl(app.selfieUrl),
        ]);
        const hasBothDocs = Boolean(idDocUrl && selfieUrl);
        return {
          ...app,
          idDocUrl,
          selfieUrl,
          hasBothDocs,
        };
      }),
    );

    return resolvedList;
  } catch (err) {
    console.error("getAdminApplications error:", err);
    return [];
  }
};

export const approveCreatorApplication = async (
  applicantId: string,
  approvalType: "creator" | "vip",
  options?: { category?: string; niche?: string; notes?: string },
): Promise<boolean> => {
  if (!applicantId) throw new Error("Applicant ID is required.");

  const isVip = approvalType === "vip";

  // 1. Update public.users
  const userUpdates: Record<string, any> = {
    role: "creator",
    status: "active",
    kyc_status: "verified",
  };

  const { error: userError } = await supabase
    .from("users")
    .update(userUpdates)
    .or(`uid.eq.${applicantId},id.eq.${applicantId}`);

  if (userError) {
    console.warn(
      "approveCreatorApplication users update note:",
      userError.message,
    );
  }

  // 2. Upsert creator_profiles
  try {
    const profileUpdates: Record<string, any> = {
      user_id: applicantId,
      is_active: true,
      kyc_status: "verified",
      updated_at: new Date().toISOString(),
    };
    if (isVip) {
      profileUpdates.is_featured = true;
      profileUpdates.niche = "VIP Creator";
      profileUpdates.tags = ["VIP Creator", "Exclusive Access", "Direct Chat"];
    }
    if (options?.category) {
      profileUpdates.category = options.category;
    }

    await supabase
      .from("creator_profiles")
      .upsert(profileUpdates, { onConflict: "user_id" });
  } catch (err) {
    console.warn("creator_profiles upsert note:", err);
  }

  // 3. Update localStorage caches & Verified Badge lists
  if (typeof window !== "undefined") {
    try {
      const existingLocal = getStoredCreatorProfile(applicantId) || {};
      const updatedLocal = {
        ...existingLocal,
        role: "creator",
        status: "active",
        kyc_status: "verified",
        is_verified: true,
        is_vip: isVip,
        is_featured: isVip,
        niche: isVip ? "VIP Creator" : existingLocal.niche || "Creator",
        tags: isVip
          ? ["VIP Creator", "Exclusive Access", "Direct Chat"]
          : existingLocal.tags || ["VIP Content", "Direct Chat"],
      };
      localStorage.setItem(
        `tgd_creator_profile_${applicantId}`,
        JSON.stringify(updatedLocal),
      );

      // Remove from pending_creator_kyc queue
      const pendingQueue = JSON.parse(
        localStorage.getItem("pending_creator_kyc") || "[]",
      );
      if (Array.isArray(pendingQueue)) {
        localStorage.setItem(
          "pending_creator_kyc",
          JSON.stringify(
            pendingQueue.filter((item: any) => item.uid !== applicantId),
          ),
        );
      }

      // Add to verified IDs
      const verifiedIds = new Set(
        JSON.parse(localStorage.getItem("tgd_verified_creator_ids") || "[]"),
      );
      verifiedIds.add(applicantId);
      localStorage.setItem(
        "tgd_verified_creator_ids",
        JSON.stringify(Array.from(verifiedIds)),
      );

      // Add to VIP creator IDs if VIP
      if (isVip) {
        const vipIds = new Set(
          JSON.parse(localStorage.getItem("tgd_vip_creator_ids") || "[]"),
        );
        vipIds.add(applicantId);
        localStorage.setItem(
          "tgd_vip_creator_ids",
          JSON.stringify(Array.from(vipIds)),
        );
      }
    } catch {}

    window.dispatchEvent(new CustomEvent("creators_updated"));
    window.dispatchEvent(new CustomEvent("profile_updated"));
    window.dispatchEvent(new CustomEvent("applications_updated"));
    window.dispatchEvent(new CustomEvent("posts_updated"));
  }

  // 4. Send notification to applicant
  const notifTitle = isVip
    ? "👑 Promoted to VIP Creator!"
    : "Identity & Creator Application Approved! 🎉";
  const notifMessage = isVip
    ? "Congratulations! Your identity documents were verified and Admin has granted you exclusive VIP Creator status. Your profile is now featured at the top of Discover and Feed!"
    : "Congratulations! Your KYC documents have been approved by Admin. Your profile now has the official Blue Verified Badge and full Creator Studio access.";

  createNotification(applicantId, {
    title: notifTitle,
    message: notifMessage,
    type: "system",
    badge: isVip ? "VIP 👑" : "Verified",
    link: "/dashboard",
    action_label: "Open Creator Studio",
    action_url: "/dashboard",
  }).catch(() => {});

  // 5. Broadcast to subscribers/fans that a new creator is live
  try {
    const { data: u } = await supabase
      .from("users")
      .select("name, avatar")
      .or(`uid.eq.${applicantId},id.eq.${applicantId}`)
      .maybeSingle();
    notifySubscribersOfNewCreator(
      applicantId,
      u?.name || (isVip ? "VIP Creator" : "New Creator"),
      u?.avatar,
    ).catch(() => {});
  } catch {}

  return true;
};

export const rejectCreatorApplication = async (
  applicantId: string,
  reason?: string,
): Promise<boolean> => {
  if (!applicantId) throw new Error("Applicant ID is required.");

  // 1. Update public.users
  await supabase
    .from("users")
    .update({ kyc_status: "rejected" })
    .or(`uid.eq.${applicantId},id.eq.${applicantId}`);

  // 2. Update local storage
  if (typeof window !== "undefined") {
    try {
      const existingLocal = getStoredCreatorProfile(applicantId) || {};
      localStorage.setItem(
        `tgd_creator_profile_${applicantId}`,
        JSON.stringify({
          ...existingLocal,
          kyc_status: "rejected",
          is_verified: false,
        }),
      );

      const pendingQueue = JSON.parse(
        localStorage.getItem("pending_creator_kyc") || "[]",
      );
      if (Array.isArray(pendingQueue)) {
        localStorage.setItem(
          "pending_creator_kyc",
          JSON.stringify(
            pendingQueue.filter((item: any) => item.uid !== applicantId),
          ),
        );
      }
    } catch {}

    window.dispatchEvent(new CustomEvent("applications_updated"));
    window.dispatchEvent(new CustomEvent("creators_updated"));
  }

  // 3. Notify user
  createNotification(applicantId, {
    title: "Identity Verification Needs Review ⚠️",
    message:
      reason ||
      "Your submitted verification documents could not be approved. Please log in and upload a clear photo of your National ID and selfie.",
    type: "system",
    badge: "Review",
    link: "/edit-profile",
    action_label: "Re-submit Documents",
    action_url: "/edit-profile",
  }).catch(() => {});

  return true;
};

export const updateCreatorStatus = async (
  creatorId: string,
  newStatus: "active" | "pending" | "suspended",
) => {
  const roleMap = {
    active: "creator",
    pending: "pending_creator",
    suspended: "suspended_creator",
  };

  const userUpdates: Record<string, any> = {
    role: roleMap[newStatus] as string,
    status: newStatus === "suspended" ? "suspended" : "active",
  };

  try {
    const { error } = await supabase
      .from("users")
      .update(userUpdates)
      .or(`uid.eq.${creatorId},id.eq.${creatorId}`);

    if (error) {
      // Fallback if status column is not in users table
      const { error: roleErr } = await supabase
        .from("users")
        .update({ role: roleMap[newStatus] as string })
        .or(`uid.eq.${creatorId},id.eq.${creatorId}`);
      if (roleErr)
        console.warn(
          "updateCreatorStatus role update notice:",
          roleErr.message,
        );
    }
  } catch (err) {
    console.warn("updateCreatorStatus users table error:", err);
  }

  try {
    await supabase
      .from("creator_profiles")
      .update({
        status: newStatus,
        is_active: newStatus === "active",
      })
      .or(`user_id.eq.${creatorId},id.eq.${creatorId}`);
  } catch (err) {
    console.warn("updateCreatorStatus creator_profiles table error:", err);
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`tgd_user_status_${creatorId}`, newStatus);
      const existingLocal = getStoredCreatorProfile(creatorId) || {};
      localStorage.setItem(
        `tgd_creator_profile_${creatorId}`,
        JSON.stringify({
          ...existingLocal,
          status: newStatus,
          is_active: newStatus === "active",
        }),
      );
    } catch {}
    window.dispatchEvent(
      new CustomEvent("account_status_changed", {
        detail: { userId: creatorId, status: newStatus },
      }),
    );
    window.dispatchEvent(new CustomEvent("creators_updated"));
    window.dispatchEvent(new CustomEvent("posts_updated"));
  }

  if (newStatus === "suspended") {
    try {
      // Terminate any active live streams immediately
      await supabase
        .from("live_streams")
        .update({ is_live: false, ended_at: new Date().toISOString() })
        .eq("creator_id", creatorId)
        .eq("is_live", true);
    } catch {}
  }

  if (newStatus === "active") {
    try {
      const [{ data: user }, { data: profile }] = await Promise.all([
        supabase
          .from("users")
          .select("*")
          .or(`uid.eq.${creatorId},id.eq.${creatorId}`)
          .maybeSingle(),
        supabase
          .from("creator_profiles")
          .select("*")
          .or(`user_id.eq.${creatorId},id.eq.${creatorId}`)
          .maybeSingle(),
      ]);

      const local = getStoredCreatorProfile(creatorId);
      const hasId = Boolean(
        user?.kyc_id_url ||
        profile?.kyc_id_url ||
        (local as any)?.kyc_id_url ||
        (local as any)?.idDocument,
      );
      const hasSelfie = Boolean(
        user?.kyc_selfie_url ||
        profile?.kyc_selfie_url ||
        (local as any)?.kyc_selfie_url ||
        (local as any)?.selfie,
      );
      const hasFilledKyc =
        (hasId && hasSelfie) ||
        user?.kyc_status === "pending" ||
        profile?.kyc_status === "pending" ||
        (local as any)?.kyc_status === "pending";

      // When the admin approves any account that has filled KYC, grant them the blue verified badge!
      if (hasFilledKyc) {
        await supabase
          .from("users")
          .update({ kyc_status: "verified" })
          .or(`uid.eq.${creatorId},id.eq.${creatorId}`);

        if (typeof window !== "undefined") {
          try {
            const existingLocal = getStoredCreatorProfile(creatorId) || {};
            localStorage.setItem(
              `tgd_creator_profile_${creatorId}`,
              JSON.stringify({
                ...existingLocal,
                kyc_status: "verified",
                is_verified: true,
              }),
            );

            const verifiedIds = new Set(
              JSON.parse(
                localStorage.getItem("tgd_verified_creator_ids") || "[]",
              ),
            );
            verifiedIds.add(creatorId);
            localStorage.setItem(
              "tgd_verified_creator_ids",
              JSON.stringify(Array.from(verifiedIds)),
            );
          } catch {}
          window.dispatchEvent(new CustomEvent("creators_updated"));
          window.dispatchEvent(new CustomEvent("posts_updated"));
        }
      }

      notifySubscribersOfNewCreator(
        creatorId,
        user?.name || "Verified Creator",
        user?.avatar,
      ).catch(() => {});
    } catch (e) {
      console.warn("Notice updating approved creator verification state:", e);
    }
  }

  return true;
};

export const getAdminUsers = async () => {
  try {
    // 1. Gather all creator IDs from creator_profiles, posts, and creator roles to strictly exclude them
    const creatorUids = new Set<string>();

    try {
      const { data: profiles } = await supabase
        .from("creator_profiles")
        .select("user_id");
      (profiles || []).forEach((p) => {
        if (p.user_id) creatorUids.add(p.user_id);
      });
    } catch {}

    try {
      const { data: posts } = await supabase.from("posts").select("creator_id");
      (posts || []).forEach((p) => {
        if (p.creator_id) creatorUids.add(p.creator_id);
      });
    } catch {}

    if (typeof window !== "undefined") {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("tgd_creator_profile_")) {
            creatorUids.add(key.replace("tgd_creator_profile_", ""));
          }
        }
      } catch {}
    }

    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !users) return [];

    const deletedUserIds =
      typeof window !== "undefined"
        ? new Set(
            JSON.parse(localStorage.getItem("tgd_deleted_creator_ids") || "[]"),
          )
        : new Set();

    // Strictly separate: Only include subscribers/fans (exclude creators, escorts, and admins)
    const subscriberUsers = users.filter((u) => {
      if (deletedUserIds.has(u.uid) || deletedUserIds.has(u.id)) return false;
      const r = (u.role || "").toLowerCase();
      if (
        r === "creator" ||
        r === "pending_creator" ||
        r === "suspended_creator" ||
        r === "escort" ||
        r === "admin" ||
        creatorUids.has(u.uid) ||
        creatorUids.has(u.id)
      ) {
        return false;
      }
      return true;
    });

    const { data: txs } = await supabase
      .from("transactions")
      .select("from_user_id, gross_amount, type")
      .eq("status", "completed")
      .neq("type", "payout");

    const spentMap = new Map<string, number>();
    (txs || []).forEach((t) => {
      if (t.from_user_id) {
        spentMap.set(
          t.from_user_id,
          (spentMap.get(t.from_user_id) || 0) + (t.gross_amount || 0),
        );
      }
    });

    const { data: subs } = await supabase
      .from("subscriptions")
      .select("fan_id")
      .eq("status", "active");

    const subsMap = new Map<string, number>();
    (subs || []).forEach((s) => {
      if (s.fan_id) {
        subsMap.set(s.fan_id, (subsMap.get(s.fan_id) || 0) + 1);
      }
    });

    return subscriberUsers.map((u) => {
      const localStatus =
        typeof window !== "undefined"
          ? localStorage.getItem(`tgd_user_status_${u.uid}`)
          : null;
      const status = localStatus || u.status || "active";
      return {
        id: u.uid,
        name: u.name || "Anonymous Subscriber",
        email: u.email || "No email",
        type: "subscriber",
        subs: subsMap.get(u.uid) || 0,
        spent: `KES ${(spentMap.get(u.uid) || 0).toLocaleString()}`,
        status,
        joined: u.created_at
          ? new Date(u.created_at).toLocaleDateString("en-KE", {
              month: "short",
              year: "numeric",
            })
          : "Recent",
        last_seen: (u as any).last_seen || getUserLastSeen(u.uid) || null,
        img: resolveUserAvatar(u.avatar, u.name),
      };
    });
  } catch (err) {
    console.error("Error fetching admin users:", err);
    return [];
  }
};

export const updateUserStatus = async (
  userId: string,
  newStatus: "active" | "banned" | "suspended",
) => {
  try {
    await supabase
      .from("users")
      .update({ status: newStatus })
      .or(`uid.eq.${userId},id.eq.${userId}`);
    try {
      await supabase
        .from("creator_profiles")
        .update({ status: newStatus })
        .or(`user_id.eq.${userId},id.eq.${userId}`);
    } catch {}

    if (newStatus === "banned" || newStatus === "suspended") {
      try {
        await supabase
          .from("live_streams")
          .update({ is_live: false, ended_at: new Date().toISOString() })
          .eq("creator_id", userId)
          .eq("is_live", true);
      } catch {}

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`tgd_user_status_${userId}`, newStatus);
        } catch {}
        window.dispatchEvent(
          new CustomEvent("account_status_changed", {
            detail: { userId, status: newStatus },
          }),
        );
        window.dispatchEvent(new CustomEvent("creators_updated"));
        window.dispatchEvent(new CustomEvent("posts_updated"));
      }
    } else if (newStatus === "active") {
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(`tgd_user_status_${userId}`);
        } catch {}
        window.dispatchEvent(
          new CustomEvent("account_status_changed", {
            detail: { userId, status: "active" },
          }),
        );
        window.dispatchEvent(new CustomEvent("creators_updated"));
        window.dispatchEvent(new CustomEvent("posts_updated"));
      }
    }
  } catch (err) {
    console.error("Error updating user status:", err);
  }
};

/**
 * Retrieves cached last_seen timestamp for a user or creator.
 */
export const getUserLastSeen = (userId: string): string | null => {
  if (typeof window === "undefined" || !userId) return null;
  try {
    return localStorage.getItem(`tgd_last_seen_${userId}`) || null;
  } catch {
    return null;
  }
};

/**
 * Records an active heartbeat for the user or creator, keeping presence status fresh.
 * Writes to localStorage immediately and syncs asynchronously to Supabase.
 */
export const updateUserLastSeen = async (userId: string): Promise<string> => {
  const now = new Date().toISOString();
  if (!userId) return now;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`tgd_last_seen_${userId}`, now);
      window.dispatchEvent(
        new CustomEvent("tgd_presence_updated", {
          detail: { userId, lastSeen: now },
        }),
      );
    } catch {}
  }

  try {
    await supabase
      .from("users")
      .update({ last_seen: now })
      .or(`uid.eq.${userId},id.eq.${userId}`);
  } catch (err) {
    // Non-blocking fallback
  }

  return now;
};

export const requestCreatorPayout = async (
  creatorId: string,
  amount: number,
  phone: string,
  method: string = "M-Pesa",
) => {
  const payoutAmountError = getCreatorPayoutAmountError(amount);
  if (!creatorId || payoutAmountError) {
    throw new Error(
      payoutAmountError || "Please enter a valid withdrawal amount.",
    );
  }

  const cleanPhone = phone.trim() || "Not specified";
  const refString = `${method} | ${cleanPhone}`;

  let creatorName = "Creator";
  let creatorEmail = "";
  let requiresPayoutKyc = false;
  const { data: userRow, error: userProfileError } = await supabase
    .from("users")
    .select(
      "name, email, phone, status, role, payout_kyc_required, kyc_id_url, kyc_selfie_url",
    )
    .eq("uid", creatorId)
    .maybeSingle();

  if (userProfileError) {
    throw new Error(
      `Could not verify payout eligibility: ${userProfileError.message}`,
    );
  }
  if (!userRow) {
    throw new Error("Creator account not found. Cannot request payout.");
  }

  requiresPayoutKyc = Boolean(userRow.payout_kyc_required);
  if (
    requiresPayoutKyc &&
    !hasPrivateKycEvidence(
      creatorId,
      userRow.kyc_id_url,
      userRow.kyc_selfie_url,
    )
  ) {
    throw new Error(
      "Upload your National ID and selfie with ID before requesting a withdrawal.",
    );
  }

  if (
    userRow.status === "suspended" ||
    userRow.status === "banned" ||
    userRow.role === "suspended_creator"
  ) {
    throw new Error(
      "Withdrawals and payouts are disabled because this creator account is suspended. Please contact platform administration.",
    );
  }
  if (userRow.name) creatorName = userRow.name;
  if (userRow.email) creatorEmail = userRow.email;

  let payoutTx: any = {
    id: `payout_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type: "payout",
    from_user_id: creatorId,
    to_creator_id: creatorId,
    gross_amount: amount,
    platform_fee: 0,
    net_amount: amount,
    status: "pending",
    reference_id: refString,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        type: "payout",
        from_user_id: creatorId,
        to_creator_id: creatorId,
        gross_amount: amount,
        platform_fee: 0,
        net_amount: amount,
        status: "pending",
        reference_id: refString,
      })
      .select()
      .maybeSingle();

    if (data) {
      payoutTx = data;
    }
    if (error) {
      if (requiresPayoutKyc) {
        throw new Error(
          error.message ||
            "Your ID and selfie must be uploaded before withdrawal.",
        );
      }
      console.warn("Supabase payout insert notice:", error.message);
    }
  } catch (err) {
    if (requiresPayoutKyc) throw err;
    console.warn("Supabase payout insert exception:", err);
  }

  // Save in local transactions cache
  if (typeof window !== "undefined") {
    try {
      const localKey = "tgd_all_transactions";
      const list = JSON.parse(localStorage.getItem(localKey) || "[]");
      localStorage.setItem(localKey, JSON.stringify([payoutTx, ...list]));
    } catch {}
  }

  // Notify Creator of pending withdrawal
  try {
    await createNotification(creatorId, {
      title: "Withdrawal Request Submitted ⏳",
      message: `Your withdrawal request of KES ${amount.toLocaleString()} via ${method} (${cleanPhone}) has been sent to Admin for processing.`,
      type: "system",
      link: "/wallet",
      action_label: "View Wallet",
      action_url: "/wallet",
      badge: "Payout Pending",
    });
  } catch {}

  // Notify all Admin users in Supabase
  try {
    const { data: admins } = await supabase
      .from("users")
      .select("uid")
      .eq("role", "admin");

    const adminIds = new Set<string>(
      (admins || []).map((a: any) => a.uid).filter(Boolean),
    );
    for (const adminId of adminIds) {
      await createNotification(adminId, {
        title: "Creator Withdrawal Request! 💸",
        message: `${creatorName}${creatorEmail ? ` (${creatorEmail})` : ""} requested to withdraw KES ${amount.toLocaleString()} via ${method} to ${cleanPhone}.`,
        type: "system",
        link: "/admin/payouts",
        action_label: "Review Payout",
        action_url: "/admin/payouts",
        badge: "Payout Request",
      });
    }
  } catch (err) {
    console.warn("Admin notification error:", err);
  }

  // Log in Admin Audit Log so Admin sees it in Overview & Audit Log
  try {
    await logAdminAction({
      admin: creatorName,
      action: "Requested Withdrawal",
      target: `${creatorName} (${cleanPhone})`,
      details: `Requested payout of KES ${amount.toLocaleString()} via ${method} to ${cleanPhone}`,
      type: "payout",
      ip: "Creator Wallet",
    });
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("payouts_updated"));
    window.dispatchEvent(
      new CustomEvent("wallet_updated", { detail: { creatorId } }),
    );
  }

  return payoutTx;
};

export const getAdminPayouts = async () => {
  try {
    let remotePayouts: any[] = [];
    const { data: payoutTxs, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("type", "payout")
      .order("created_at", { ascending: false });

    if (!error && payoutTxs) {
      remotePayouts = payoutTxs;
    }

    let localPayouts: any[] = [];
    if (typeof window !== "undefined") {
      try {
        const list = JSON.parse(
          localStorage.getItem("tgd_all_transactions") || "[]",
        );
        localPayouts = list.filter(
          (t: any) => t.type === "payout" || t.type === "withdrawal",
        );
      } catch {}
    }

    const seen = new Set<string>();
    const allPayoutTxs: any[] = [];
    for (const item of [...remotePayouts, ...localPayouts]) {
      const key =
        item.id ||
        `${item.to_creator_id}_${item.created_at}_${item.net_amount}`;
      if (!seen.has(key)) {
        seen.add(key);
        allPayoutTxs.push(item);
      }
    }

    allPayoutTxs.sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime(),
    );

    if (allPayoutTxs.length === 0) return [];

    const creatorIds = Array.from(
      new Set(
        allPayoutTxs
          .map((t) => t.to_creator_id || t.from_user_id)
          .filter(Boolean),
      ),
    );
    const userMap = new Map<string, any>();
    const profileMap = new Map<string, any>();

    if (creatorIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("uid, name, email, phone, avatar")
        .in("uid", creatorIds);
      (users || []).forEach((u) => userMap.set(u.uid, u));

      const { data: profiles } = await supabase
        .from("creator_profiles")
        .select("user_id, display_name, avatar_url, avatar, total_earnings")
        .in("user_id", creatorIds);
      (profiles || []).forEach((p) => profileMap.set(p.user_id, p));
    }

    return allPayoutTxs.map((tx) => {
      const cid = tx.to_creator_id || tx.from_user_id;
      const u = userMap.get(cid);
      const p = profileMap.get(cid);
      const rawAmount = Number(tx.net_amount || tx.gross_amount || 0);

      let method = "M-Pesa";
      let phone = u?.phone || "Not provided";
      if (tx.reference_id && typeof tx.reference_id === "string") {
        if (tx.reference_id.includes("|")) {
          const parts = tx.reference_id.split("|").map((s: string) => s.trim());
          if (parts[0]) method = parts[0];
          if (parts[1]) phone = parts[1];
        } else {
          phone = tx.reference_id;
        }
      }

      const rawStatus = String(tx.status || "pending").toLowerCase();
      const mappedStatus =
        rawStatus === "completed" || rawStatus === "approved"
          ? "approved"
          : rawStatus === "rejected" || rawStatus === "failed"
            ? "rejected"
            : "pending";

      const displayName = u?.name || p?.display_name || "Creator";

      return {
        id: tx.id,
        creatorId: cid,
        creator: displayName,
        email: u?.email || "No email",
        amount: `KES ${rawAmount.toLocaleString()}`,
        rawAmount,
        method,
        phone,
        status: mappedStatus,
        requested: tx.created_at
          ? new Date(tx.created_at).toLocaleDateString("en-KE", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Recent",
        img: resolveUserAvatar(
          u?.avatar || p?.avatar_url || p?.avatar,
          displayName,
        ),
      };
    });
  } catch (err) {
    console.error("Error fetching admin payouts:", err);
    return [];
  }
};

export const updateAdminPayoutStatus = async (
  payoutId: string,
  creatorId: string,
  amount: number,
  phone: string,
  action: "approved" | "rejected",
) => {
  const dbStatus = action === "approved" ? "completed" : "rejected";

  try {
    await supabase
      .from("transactions")
      .update({ status: dbStatus })
      .eq("id", payoutId);
  } catch (err) {
    console.warn("Error updating payout status in Supabase:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const localKey = "tgd_all_transactions";
      const list = JSON.parse(localStorage.getItem(localKey) || "[]");
      const updated = list.map((t: any) =>
        t.id === payoutId ? { ...t, status: dbStatus } : t,
      );
      localStorage.setItem(localKey, JSON.stringify(updated));
    } catch {}
  }

  // Send notification to Creator
  if (creatorId) {
    try {
      if (action === "approved") {
        await createNotification(creatorId, {
          title: "Payout Sent to Your M-Pesa! 💸",
          message: `Your withdrawal of KES ${amount.toLocaleString()} has been approved by Admin and sent to ${phone}.`,
          type: "system",
          link: "/wallet",
          action_label: "View Wallet",
          action_url: "/wallet",
          badge: "Paid Out",
        });
      } else {
        await createNotification(creatorId, {
          title: "Withdrawal Request Declined",
          message: `Your withdrawal request of KES ${amount.toLocaleString()} was declined by Admin. The funds have been restored to your available wallet balance.`,
          type: "warning",
          link: "/wallet",
          action_label: "View Wallet",
          action_url: "/wallet",
          badge: "Returned",
        });
      }
    } catch {}
  }

  // Log Admin Audit Action
  try {
    await logAdminAction({
      admin: "Admin",
      action:
        action === "approved"
          ? "Approved Creator Payout"
          : "Rejected Creator Payout",
      target: `${phone} (KES ${amount.toLocaleString()})`,
      details: `${action === "approved" ? "Disbursed" : "Declined"} withdrawal of KES ${amount.toLocaleString()} (${payoutId})`,
      type: action === "approved" ? "payout" : "reject",
      ip: "Admin Portal",
    });
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("payouts_updated"));
    window.dispatchEvent(
      new CustomEvent("wallet_updated", { detail: { creatorId } }),
    );
  }
};

export const getAdminContentPosts = async () => {
  try {
    const { data: posts, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!posts || posts.length === 0) return [];

    const creatorIds = Array.from(
      new Set(posts.map((p) => p.creator_id).filter(Boolean)),
    );
    const userMap = new Map<string, any>();
    if (creatorIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("uid, name, avatar")
        .in("uid", creatorIds);
      (users || []).forEach((u) => userMap.set(u.uid, u));
    }

    return posts.map((p) => {
      const u = userMap.get(p.creator_id);
      const mediaUrl = p.media_url || "";
      const isVideo =
        p.media_type === "video" ||
        Boolean(
          mediaUrl &&
          /\.(mp4|webm|mov|m4v|ogg|ogv|mkv|avi)($|\?)/i.test(mediaUrl),
        );
      const hasMedia = Boolean(mediaUrl);

      return {
        ...p,
        id: p.id,
        creator: u?.name || "Creator",
        creatorId: p.creator_id,
        creatorAvatar: resolveUserAvatar(u?.avatar, u?.name),
        media_url: mediaUrl,
        media_type:
          p.media_type || (isVideo ? "video" : hasMedia ? "image" : "text"),
        type: isVideo ? "Video" : hasMedia ? "Photo" : "Post",
        title:
          p.content ||
          (isVideo ? "Video Upload" : hasMedia ? "Photo Upload" : "Text Post"),
        reports: p.reports ?? 0,
        reason: p.reason || "General Review",
        status: p.status || "published",
        img: mediaUrl,
        time: p.created_at
          ? new Date(p.created_at).toLocaleDateString("en-KE", {
              day: "numeric",
              month: "short",
            })
          : "Recent",
      };
    });
  } catch (err) {
    console.error("Error fetching admin content posts:", err);
    return [];
  }
};

export const getAdminAnalyticsData = async () => {
  try {
    const overview = await getAdminOverviewStats();

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    const last7DaysLabels: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      last7DaysLabels.push(days[d.getDay()]);
    }

    const { data: txs } = await supabase
      .from("transactions")
      .select("gross_amount, status, created_at, reference_id, type")
      .eq("status", "completed");

    const revenueByDay = [0, 0, 0, 0, 0, 0, 0];
    let mpesaCount = 0;
    let cardCount = 0;
    let otherCount = 0;

    (txs || []).forEach((t) => {
      if (t.created_at) {
        const d = new Date(t.created_at);
        const diffDays = Math.floor(
          (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (diffDays >= 0 && diffDays < 7) {
          revenueByDay[6 - diffDays] += Math.round(
            (t.gross_amount || 0) / 1000,
          ); // in thousands
        }
      }
      if (
        t.reference_id?.startsWith("pstk_") ||
        t.type === "card" ||
        t.type === "subscription"
      ) {
        cardCount++;
      } else {
        mpesaCount++;
      }
    });

    const totalTxCount = mpesaCount + cardCount + otherCount;
    const paymentMethods =
      totalTxCount > 0
        ? [
            {
              method: "M-Pesa",
              percent: Math.round((mpesaCount / totalTxCount) * 100),
              color: "bg-emerald-500",
            },
            {
              method: "Visa / Card",
              percent: Math.round((cardCount / totalTxCount) * 100),
              color: "bg-blue-500",
            },
            {
              method: "Bank Transfer",
              percent: Math.round((otherCount / totalTxCount) * 100),
              color: "bg-zinc-400",
            },
          ]
        : [
            { method: "M-Pesa", percent: 75, color: "bg-emerald-500" },
            { method: "Visa / Card", percent: 25, color: "bg-blue-500" },
            { method: "Bank Transfer", percent: 0, color: "bg-zinc-400" },
          ];

    const { data: users } = await supabase.from("users").select("created_at");
    const usersByDay = [0, 0, 0, 0, 0, 0, 0];
    (users || []).forEach((u) => {
      if (u.created_at) {
        const d = new Date(u.created_at);
        const diffDays = Math.floor(
          (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (diffDays >= 0 && diffDays < 7) {
          usersByDay[6 - diffDays] += 1;
        }
      }
    });

    const creators = await getAdminCreators();
    const sortedCreators = [...creators].slice(0, 5);

    const { data: subs } = await supabase
      .from("subscriptions")
      .select("tier_price");
    const avgSub =
      subs && subs.length > 0
        ? Math.round(
            subs.reduce((acc, s) => acc + (s.tier_price || 1000), 0) /
              subs.length,
          )
        : 1000;

    return {
      weekDays: last7DaysLabels,
      revenueData: revenueByDay,
      userGrowth: usersByDay,
      topCreators: sortedCreators,
      paymentMethods,
      totalRevenue: overview.totalRevenue,
      activeCreators: overview.totalCreators,
      activeFans: overview.totalFans,
      avgSubValue: avgSub,
    };
  } catch (err) {
    console.error("Error in getAdminAnalyticsData:", err);
    return null;
  }
};

export interface AdminReport {
  id: string;
  reporter: string;
  reporterEmail: string;
  target: string;
  targetType: "Creator" | "Post" | "User";
  reason: string;
  details: string;
  status: "open" | "resolved" | "escalated" | "dismissed";
  date: string;
  reporterImg?: string;
  targetImg?: string;
}

export const getAdminReports = async (): Promise<AdminReport[]> => {
  try {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((r) => ({
        id: r.id,
        reporter: r.reporter_name || "Anonymous Fan",
        reporterEmail: r.reporter_email || "",
        target: r.target_name || r.target_id || "Content Item",
        targetType: r.target_type || "Post",
        reason: r.reason || "General Concern",
        details: r.details || r.description || "",
        status: r.status || "open",
        date: r.created_at
          ? new Date(r.created_at).toLocaleDateString("en-KE", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "Recent",
        reporterImg: resolveUserAvatar(r.reporter_avatar, r.reporter_name),
        targetImg: r.target_image || undefined,
      }));
    }
  } catch {}

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("tgd_admin_reports");
      if (raw) return JSON.parse(raw);
    } catch {}
  }

  return [];
};

export const updateAdminReportStatus = async (
  id: string,
  newStatus: "open" | "resolved" | "escalated" | "dismissed",
) => {
  try {
    await supabase.from("reports").update({ status: newStatus }).eq("id", id);
  } catch {}

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("tgd_admin_reports");
      if (raw) {
        const list: AdminReport[] = JSON.parse(raw);
        const updated = list.map((r) =>
          r.id === id ? { ...r, status: newStatus } : r,
        );
        localStorage.setItem("tgd_admin_reports", JSON.stringify(updated));
      }
    } catch {}
  }
};

export interface AdminAuditLogEntry {
  id: string;
  admin: string;
  action: string;
  target: string;
  details: string;
  type:
    | "approve"
    | "ban"
    | "payout"
    | "delete"
    | "reject"
    | "flag"
    | "settings";
  timestamp: string;
  ip: string;
}

export const getAdminAuditLogs = async (): Promise<AdminAuditLogEntry[]> => {
  try {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((l) => ({
        id: l.id,
        admin: l.admin_name || l.admin_email || "Admin",
        action: l.action,
        target: l.target,
        details: l.details,
        type: l.type || "settings",
        timestamp: l.created_at
          ? new Date(l.created_at).toLocaleDateString("en-KE", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Recent",
        ip: l.ip || "197.156.XX.XX",
      }));
    }
  } catch {}

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("tgd_admin_audit_logs");
      if (raw) return JSON.parse(raw);
    } catch {}
  }

  return [];
};

export const logAdminAction = async (
  entry: Omit<AdminAuditLogEntry, "id" | "timestamp">,
) => {
  const newLog: AdminAuditLogEntry = {
    ...entry,
    id: `LOG_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    timestamp: new Date().toLocaleDateString("en-KE", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  try {
    await supabase.from("audit_logs").insert([
      {
        action: newLog.action,
        target: newLog.target,
        details: newLog.details,
        type: newLog.type,
        admin_name: newLog.admin,
        ip: newLog.ip,
      },
    ]);
  } catch {}

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("tgd_admin_audit_logs");
      const list: AdminAuditLogEntry[] = raw ? JSON.parse(raw) : [];
      list.unshift(newLog);
      localStorage.setItem(
        "tgd_admin_audit_logs",
        JSON.stringify(list.slice(0, 100)),
      );
    } catch {}
  }
};

export interface PlatformSettings {
  platformFee: string;
  minPayout: string;
  announcement: string;
  emailAlerts: boolean;
  maintenanceMode: boolean;
  newCreators: boolean;
  autoApprove: boolean;
}

export const getPlatformSettings = async (): Promise<PlatformSettings> => {
  const defaults: PlatformSettings = {
    platformFee: "30",
    minPayout: "1000",
    announcement: "",
    emailAlerts: true,
    maintenanceMode: false,
    newCreators: true,
    autoApprove: false,
  };

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("tgd_platform_settings");
      if (raw) return { ...defaults, ...JSON.parse(raw) };
    } catch {}
  }

  return defaults;
};

export const savePlatformSettings = async (
  settings: PlatformSettings,
): Promise<void> => {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("tgd_platform_settings", JSON.stringify(settings));
    } catch {}
  }

  try {
    await supabase.from("platform_settings").upsert({
      id: 1,
      ...settings,
      updated_at: new Date().toISOString(),
    });
  } catch {}
};

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type:
    | "subscription"
    | "tip"
    | "ppv"
    | "comment"
    | "like"
    | "system"
    | "warning"
    | "creator";
  link?: string;
  avatar?: string;
  badge?: string;
  action_label?: string;
  action_url?: string;
  is_read: boolean;
  created_at: string;
  payment_details?: {
    gross_amount: number;
    platform_fee: number;
    net_amount: number;
    payer_name: string;
    payer_avatar?: string;
    creator_name?: string;
    creator_avatar?: string;
    recipient_name: string;
    recipient_avatar?: string;
    currency?: string;
    type?: string;
    status: string;
    payment_method: string;
    reference?: string;
    transaction_id?: string;
  };
}

export const createNotification = async (
  userId: string,
  notification: {
    title: string;
    message: string;
    type?:
      | "subscription"
      | "tip"
      | "ppv"
      | "comment"
      | "like"
      | "system"
      | "warning"
      | "creator";
    link?: string;
    avatar?: string;
    badge?: string;
    action_label?: string;
    action_url?: string;
  },
): Promise<NotificationItem> => {
  const newNotif: NotificationItem = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId,
    title: notification.title,
    message: notification.message,
    type: notification.type || "subscription",
    link: notification.link || notification.action_url || "",
    avatar: notification.avatar,
    badge: notification.badge,
    action_label: notification.action_label,
    action_url: notification.action_url || notification.link,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  // 1. Supabase attempt with all rich notification metadata
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      title: newNotif.title,
      message: newNotif.message,
      type: newNotif.type,
      link: newNotif.link,
      avatar: newNotif.avatar,
      badge: newNotif.badge,
      action_label: newNotif.action_label,
      action_url: newNotif.action_url,
      is_read: false,
    });
    if (error) {
      console.warn("Supabase notification insert warning:", error.message);
    }
  } catch (err) {
    console.warn("Supabase notification insert exception:", err);
  }

  // 2. Always persist to localStorage for instant real-time sync / fallback
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      const key = `tgd_notifications_${userId}`;
      const stored: NotificationItem[] = JSON.parse(
        localStorage.getItem(key) || "[]",
      );
      localStorage.setItem(
        key,
        JSON.stringify([newNotif, ...stored].slice(0, 100)),
      );
    } catch (err) {
      console.error("Local notifications error:", err);
    }
  }

  // 3. Dispatch real-time event
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("notifications_updated", { detail: { userId } }),
    );
  }

  return newNotif;
};

export const createNotificationsBatch = async (
  userIds: string[],
  notification: {
    title: string;
    message: string;
    type?:
      | "subscription"
      | "tip"
      | "ppv"
      | "comment"
      | "like"
      | "system"
      | "warning"
      | "creator";
    link?: string;
    avatar?: string;
    badge?: string;
    action_label?: string;
    action_url?: string;
  },
) => {
  if (!userIds || userIds.length === 0) return;
  const uniqueUids = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueUids.length === 0) return;

  const now = new Date().toISOString();
  const dbRecords = uniqueUids.map((uid) => ({
    user_id: uid,
    title: notification.title,
    message: notification.message,
    type: notification.type || "creator",
    link: notification.link || notification.action_url || "",
    avatar: notification.avatar || null,
    badge: notification.badge || null,
    action_label: notification.action_label || null,
    action_url: notification.action_url || notification.link || null,
    is_read: false,
    created_at: now,
  }));

  // 1. Batch insert to Supabase for all recipients (chunked in groups of 50)
  for (let i = 0; i < dbRecords.length; i += 50) {
    const chunk = dbRecords.slice(i, i + 50);
    try {
      const { error } = await supabase.from("notifications").insert(chunk);
      if (error) {
        console.warn(
          "Supabase batch notification insert warning:",
          error.message,
        );
      }
    } catch (err) {
      console.warn("Supabase batch notification insert exception:", err);
    }
  }

  // 2. Also cache to local storage for instant sync / offline fallback
  if (typeof window !== "undefined") {
    try {
      uniqueUids.forEach((uid) => {
        const item: NotificationItem = {
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          user_id: uid,
          title: notification.title,
          message: notification.message,
          type: notification.type || "creator",
          link: notification.link || notification.action_url || "",
          avatar: notification.avatar,
          badge: notification.badge,
          action_label: notification.action_label,
          action_url: notification.action_url || notification.link,
          is_read: false,
          created_at: now,
        };
        const key = `tgd_notifications_${uid}`;
        const stored: NotificationItem[] = JSON.parse(
          localStorage.getItem(key) || "[]",
        );
        localStorage.setItem(
          key,
          JSON.stringify([item, ...stored].slice(0, 100)),
        );
      });
      window.dispatchEvent(new CustomEvent("notifications_updated"));
    } catch {}
  }
};

export const notifyAdmins = async (notification: {
  title: string;
  message: string;
  type?:
    | "subscription"
    | "tip"
    | "ppv"
    | "comment"
    | "like"
    | "system"
    | "warning"
    | "creator";
  link?: string;
  avatar?: string;
  badge?: string;
  action_label?: string;
  action_url?: string;
  payment_details?: NotificationItem["payment_details"];
}) => {
  const adminIds = new Set<string>(["admin"]);

  // 1. Fetch all admin users from Supabase
  try {
    const { data: admins } = await supabase
      .from("users")
      .select("uid")
      .eq("role", "admin");
    if (admins) {
      admins.forEach((a: any) => {
        if (a.uid) adminIds.add(a.uid);
      });
    }
  } catch (err) {
    console.warn("Error fetching admin users:", err);
  }

  // 2. Batch insert notifications for admin recipients in Supabase
  await createNotificationsBatch(Array.from(adminIds), {
    ...notification,
    type: notification.type || "system",
  });

  // 3. Always store to shared admin notifications pool in LocalStorage
  const adminNotifItem: NotificationItem = {
    id: `admin_notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_id: "admin",
    title: notification.title,
    message: notification.message,
    type: notification.type || "system",
    link: notification.link || notification.action_url || "",
    avatar: notification.avatar,
    badge: notification.badge,
    action_label: notification.action_label,
    action_url: notification.action_url || notification.link,
    payment_details: notification.payment_details,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  try {
    const raw = localStorage.getItem("tgd_admin_notifications");
    const existing: NotificationItem[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(
      "tgd_admin_notifications",
      JSON.stringify([adminNotifItem, ...existing].slice(0, 100)),
    );
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("admin_notifications_updated", {
        detail: adminNotifItem,
      }),
    );
    window.dispatchEvent(
      new CustomEvent("notifications_updated", { detail: { userId: "admin" } }),
    );
  }
};

export const getAdminNotifications = async (): Promise<NotificationItem[]> => {
  let remoteItems: NotificationItem[] = [];
  try {
    const { data: adminUsers } = await supabase
      .from("users")
      .select("uid")
      .eq("role", "admin");
    const adminUids = (adminUsers || []).map((a: any) => a.uid).filter(Boolean);
    const targetUids = Array.from(new Set([...adminUids, "admin"]));

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .in("user_id", targetUids)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      remoteItems = data.map((d: any) => ({
        id: d.id,
        user_id: d.user_id,
        title: d.title,
        message: d.message,
        type: d.type || "system",
        link: d.link || "",
        avatar: d.avatar,
        badge: d.badge,
        action_label: d.action_label,
        action_url: d.action_url,
        is_read: !!d.is_read,
        created_at: d.created_at || new Date().toISOString(),
      }));
    }
  } catch (err) {
    console.warn("Error fetching remote admin notifications:", err);
  }

  // 2. Fetch live transactions to guarantee all payments done or received appear in admin notifications
  let txItems: NotificationItem[] = [];
  try {
    const { data: txs } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60);

    if (txs && txs.length > 0) {
      const userIds = Array.from(
        new Set(
          txs
            .flatMap((t: any) => [t.from_user_id, t.to_creator_id])
            .filter(Boolean),
        ),
      );

      const userMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("uid, name, avatar")
          .in("uid", userIds);
        (users || []).forEach((u) => userMap.set(u.uid, u));
      }

      // Check which transaction notification IDs have been marked read locally
      const readTxIds = new Set<string>();
      try {
        const storedRead = localStorage.getItem("tgd_admin_read_tx_notifs");
        if (storedRead) {
          JSON.parse(storedRead).forEach((id: string) => readTxIds.add(id));
        }
      } catch {}

      txItems = txs.map((t: any) => {
        const fromUser = userMap.get(t.from_user_id);
        const toCreator = userMap.get(t.to_creator_id);
        const payerName = fromUser?.name || "Subscriber";
        const creatorName = toCreator?.name || "Creator";

        return buildTransactionPaymentNotification(t, {
          payerName,
          creatorName,
          payerAvatar: fromUser?.avatar,
          creatorAvatar: toCreator?.avatar,
          isRead: readTxIds.has(`tx-${t.id}`),
        });
      });
    }
  } catch (txErr) {
    console.warn("Error building transaction notifications for admin:", txErr);
  }

  let localItems: NotificationItem[] = [];
  try {
    const raw = localStorage.getItem("tgd_admin_notifications");
    localItems = raw ? JSON.parse(raw) : [];
  } catch {}

  const seen = new Set<string>();
  const merged: NotificationItem[] = [];
  for (const item of [...txItems, ...localItems, ...remoteItems]) {
    const key = item.id || `${item.title}-${item.message}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }
  merged.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  return merged;
};

export const markAdminNotificationAsRead = async (id: string) => {
  if (id.startsWith("tx-")) {
    try {
      const stored = localStorage.getItem("tgd_admin_read_tx_notifs");
      const list: string[] = stored ? JSON.parse(stored) : [];
      if (!list.includes(id)) {
        list.push(id);
        localStorage.setItem("tgd_admin_read_tx_notifs", JSON.stringify(list));
      }
    } catch {}
  } else {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
    } catch {}
  }

  try {
    const raw = localStorage.getItem("tgd_admin_notifications");
    if (raw) {
      const list: NotificationItem[] = JSON.parse(raw);
      const updated = list.map((item) =>
        item.id === id ? { ...item, is_read: true } : item,
      );
      localStorage.setItem("tgd_admin_notifications", JSON.stringify(updated));
    }
  } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("admin_notifications_updated"));
  }
};

export const markAllAdminNotificationsAsRead = async () => {
  try {
    // 1. Mark remote admin notifications as read
    const { data: adminUsers } = await supabase
      .from("users")
      .select("uid")
      .eq("role", "admin");
    const adminUids = (adminUsers || []).map((a: any) => a.uid).filter(Boolean);
    const targetUids = Array.from(new Set([...adminUids, "admin"]));
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("user_id", targetUids);
  } catch {}

  try {
    // 2. Mark all transaction payment notifications as read locally
    const { data: txs } = await supabase.from("transactions").select("id");
    if (txs) {
      const allTxIds = txs.map((t: any) => `tx-${t.id}`);
      localStorage.setItem(
        "tgd_admin_read_tx_notifs",
        JSON.stringify(allTxIds),
      );
    }
  } catch {}

  try {
    const raw = localStorage.getItem("tgd_admin_notifications");
    if (raw) {
      const list: NotificationItem[] = JSON.parse(raw);
      const updated = list.map((item) => ({ ...item, is_read: true }));
      localStorage.setItem("tgd_admin_notifications", JSON.stringify(updated));
    }
  } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("admin_notifications_updated"));
  }
};

export const notifySubscribersOfNewContent = async (
  creatorId: string,
  creatorName: string,
  creatorAvatar: string | null | undefined,
  post: any,
) => {
  const subscriberIds = new Set<string>();

  // 1. Fetch active subscribers from Supabase
  try {
    const { data: subs, error } = await supabase
      .from("subscriptions")
      .select("fan_id")
      .eq("creator_id", creatorId)
      .eq("status", "active");

    if (!error && subs) {
      subs.forEach((s: any) => {
        if (s.fan_id && s.fan_id !== creatorId) {
          subscriberIds.add(s.fan_id);
        }
      });
    }
  } catch (err) {
    console.warn(
      "Error fetching Supabase subscribers for post notification:",
      err,
    );
  }

  // 2. Fetch active subscribers from LocalStorage
  if (typeof window !== "undefined") {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          key.startsWith("tgd_sub_") &&
          key.endsWith(`_${creatorId}`)
        ) {
          const item = JSON.parse(localStorage.getItem(key) || "{}");
          if (
            item?.fan_id &&
            item.status === "active" &&
            item.fan_id !== creatorId
          ) {
            subscriberIds.add(item.fan_id);
          }
        }
      }

      // Check creator fans list
      const rawFans = localStorage.getItem(`tgd_fans_${creatorId}`);
      if (rawFans) {
        const fans = JSON.parse(rawFans);
        if (Array.isArray(fans)) {
          fans.forEach((f: any) => {
            if (f.id && f.id !== creatorId) subscriberIds.add(f.id);
          });
        }
      }

      // Check current session fan if they are subscribed to this creator
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("sb-") || key.includes("auth-token"))) {
          const session = JSON.parse(localStorage.getItem(key) || "{}");
          const uid = session?.user?.id;
          if (uid && uid !== creatorId) {
            const userSub = localStorage.getItem(`tgd_sub_${uid}_${creatorId}`);
            if (userSub) {
              const parsed = JSON.parse(userSub);
              if (parsed.status === "active") subscriberIds.add(uid);
            }
          }
        }
      }

      // If this is a public post or PPV video, notify all platform fans
      if (
        !post.is_locked ||
        post.visibility === "public" ||
        post.visibility === "ppv" ||
        subscriberIds.size === 0
      ) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("tgd_notifications_")) {
            const uid = key.replace("tgd_notifications_", "");
            if (uid && uid !== creatorId && uid !== "admin") {
              subscriberIds.add(uid);
            }
          }
        }
      }
    } catch {}
  }

  // Also query users table for platform fans if public/ppv post
  if (
    post.visibility === "public" ||
    post.visibility === "ppv" ||
    subscriberIds.size === 0
  ) {
    try {
      const { data: allFans } = await supabase
        .from("users")
        .select("uid, role")
        .neq("uid", creatorId);
      if (allFans) {
        allFans.forEach((u: any) => {
          if (
            u.uid &&
            (u.role === "subscriber" ||
              u.role === "fan" ||
              u.role === "user" ||
              !u.role)
          ) {
            subscriberIds.add(u.uid);
          }
        });
      }
    } catch {}
  }

  const isVideo =
    post.media_type === "video" || isVideoMediaUrl(post.media_url);
  const isPpv = post.is_locked || post.visibility === "ppv";
  const contentSnippet = post.content ? post.content.trim() : "";
  const truncatedSnippet =
    contentSnippet.length > 70
      ? `${contentSnippet.slice(0, 70)}...`
      : contentSnippet;

  const title = `${creatorName} uploaded new ${isVideo ? "video" : "media"}! ${isPpv ? "🔒" : "📸"}`;
  const message = truncatedSnippet
    ? `"${truncatedSnippet}"`
    : `Check out the latest ${isPpv ? "exclusive PPV" : "media"} update from ${creatorName}!`;

  // Dispatch batch notification to active subscribers and platform fans
  await createNotificationsBatch(Array.from(subscriberIds), {
    title,
    message,
    type: "creator",
    link: "/user",
    action_label: "View Post",
    action_url: "/user",
    avatar: creatorAvatar || undefined,
    badge: isVideo
      ? isPpv
        ? "PPV Video"
        : "New Video"
      : isPpv
        ? "PPV Drop"
        : "New Post",
  });

  // Dispatch notification to Platform Admins
  try {
    await notifyAdmins({
      title: `${creatorName} Uploaded New ${isVideo ? "Video" : "Media"}! ${isVideo ? "🎬" : "📸"}`,
      message: `${creatorName} just published ${isVideo ? "a new video" : "new content"}${contentSnippet ? `: "${truncatedSnippet}"` : ""}. Review and moderate on Admin Content.`,
      link: "/admin/content",
      action_label: "Review Content",
      action_url: "/admin/content",
      avatar: creatorAvatar || undefined,
      badge: isVideo ? "New Video" : "New Media",
      type: "creator",
    });
  } catch (err) {
    console.warn("Failed to notify admins of new post:", err);
  }
};

export const notifySubscribersOfLiveStream = async (
  creatorId: string,
  creatorName: string,
  creatorAvatar: string | null | undefined,
  stream: { id: string; title: string; category?: string },
) => {
  const fanIds = new Set<string>();

  // 1. Fetch subscribers and fans from Supabase
  try {
    const { data: users } = await supabase
      .from("users")
      .select("uid, role")
      .neq("uid", creatorId);

    if (users) {
      users.forEach((u: any) => {
        if (
          u.uid &&
          (u.role === "subscriber" ||
            u.role === "fan" ||
            u.role === "user" ||
            !u.role)
        ) {
          fanIds.add(u.uid);
        }
      });
    }
  } catch (err) {
    console.warn("Error fetching users for live stream notification:", err);
  }

  // 2. Discover local subscribers/fans from LocalStorage
  if (typeof window !== "undefined") {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("tgd_notifications_")) {
          const uid = key.replace("tgd_notifications_", "");
          if (uid && uid !== creatorId && uid !== "admin") {
            fanIds.add(uid);
          }
        }
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("sb-") || key.includes("auth-token"))) {
          const session = JSON.parse(localStorage.getItem(key) || "{}");
          const uid = session?.user?.id;
          if (uid && uid !== creatorId && uid !== "admin") {
            fanIds.add(uid);
          }
        }
      }
    } catch {}
  }

  const title = `🔴 ${creatorName} is LIVE NOW!`;
  const message = `${creatorName} has started a live broadcast: "${stream.title || "Live Broadcast"}". Join now to watch and chat!`;

  // Dispatch batch notification to fans
  await createNotificationsBatch(Array.from(fanIds), {
    title,
    message,
    type: "creator",
    link: `/live/${stream.id}`,
    action_label: "Join Live",
    action_url: `/live/${stream.id}`,
    avatar: creatorAvatar || undefined,
    badge: "LIVE NOW",
  });

  // Dispatch notification to Platform Admins
  try {
    await notifyAdmins({
      title: `🔴 Creator Broadcast Live: ${creatorName}`,
      message: `${creatorName} just started broadcasting live: "${stream.title || "Live Broadcast"}". Monitor stream activity now.`,
      link: `/live/${stream.id}`,
      action_label: "Monitor Stream",
      action_url: `/live/${stream.id}`,
      avatar: creatorAvatar || undefined,
      badge: "Live Broadcast",
      type: "creator",
    });
  } catch (err) {
    console.warn("Failed to notify admins of live stream:", err);
  }
};

export const notifySubscribersOfNewCreator = async (
  creatorId: string,
  creatorName: string,
  creatorAvatar?: string | null,
) => {
  const fanIds = new Set<string>();

  // 1. Fetch all subscriber users from Supabase
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("uid, role")
      .neq("uid", creatorId);

    if (!error && users) {
      users.forEach((u: any) => {
        if (
          u.uid &&
          (u.role === "subscriber" ||
            u.role === "fan" ||
            u.role === "user" ||
            !u.role)
        ) {
          fanIds.add(u.uid);
        }
      });
    }
  } catch (err) {
    console.warn("Error fetching users for new creator notification:", err);
  }

  // 2. Discover local subscribers/fans from LocalStorage
  if (typeof window !== "undefined") {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("tgd_notifications_")) {
          const uid = key.replace("tgd_notifications_", "");
          if (uid && uid !== creatorId && uid !== "admin") {
            fanIds.add(uid);
          }
        }
      }

      // Also check current logged-in user if different from the new creator
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("sb-") || key.includes("auth-token"))) {
          const session = JSON.parse(localStorage.getItem(key) || "{}");
          const uid = session?.user?.id;
          if (uid && uid !== creatorId && uid !== "admin") {
            fanIds.add(uid);
          }
        }
      }
    } catch {}
  }

  const title = `New Creator Joined: ${creatorName}! ✨`;
  const message = `${creatorName} has just joined The Gents DollHouse. Discover their profile, explore exclusive media, and subscribe!`;

  // Dispatch batch notification to all fans
  await createNotificationsBatch(Array.from(fanIds), {
    title,
    message,
    type: "creator",
    link: `/creator/${creatorId}`,
    action_label: "View Profile",
    action_url: `/creator/${creatorId}`,
    avatar: creatorAvatar || undefined,
    badge: "New Creator",
  });

  // Dispatch notification to Platform Admins
  try {
    await notifyAdmins({
      title: `New Creator Joined Platform! 🎉`,
      message: `${creatorName} just registered on The Gents DollHouse. Review their creator account and compliance status.`,
      link: "/admin/creators",
      action_label: "Manage Creators",
      action_url: "/admin/creators",
      badge: "New Creator",
      avatar: creatorAvatar || undefined,
      type: "creator",
    });
  } catch (err) {
    console.warn("Failed to notify admins of new creator:", err);
  }
};

export const sendAdminMessage = async (creatorId: string, message: string) => {
  return createNotification(creatorId, {
    title: "Admin Moderation",
    message,
    type: "warning",
  });
};

export const getUserNotifications = async (
  userId: string,
): Promise<NotificationItem[]> => {
  let remoteItems: NotificationItem[] = [];
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      remoteItems = data.map((d: any) => ({
        id: d.id,
        user_id: d.user_id,
        title: d.title,
        message: d.message,
        type: d.type || "system",
        link: d.link || "",
        avatar: d.avatar,
        badge: d.badge,
        action_label: d.action_label,
        action_url: d.action_url,
        is_read: !!d.is_read,
        created_at: d.created_at || new Date().toISOString(),
      }));
    }
  } catch (err) {
    console.warn("Error fetching Supabase notifications:", err);
  }

  // Merge with localStorage
  // Merge with localStorage
  let localItems: NotificationItem[] = [];
  try {
    const key = `tgd_notifications_${userId}`;
    const rawLocal: NotificationItem[] = JSON.parse(
      localStorage.getItem(key) || "[]",
    );
    // Filter out legacy mock/demo notices so they never pollute live accounts
    localItems = rawLocal.filter(
      (item) =>
        item.id &&
        !item.id.startsWith("welcome-") &&
        !item.id.startsWith("mock-") &&
        !item.id.startsWith("notif-"),
    );
    if (localItems.length !== rawLocal.length) {
      localStorage.setItem(key, JSON.stringify(localItems));
    }
  } catch {}

  // Deduplicate
  const seen = new Set<string>();
  const merged: NotificationItem[] = [];

  for (const item of [...localItems, ...remoteItems]) {
    if (
      item.id &&
      (item.id.startsWith("welcome-") ||
        item.id.startsWith("mock-") ||
        item.id.startsWith("notif-"))
    ) {
      continue;
    }
    const dedupKey = item.id || `${item.title}-${item.message}`;
    if (!seen.has(dedupKey)) {
      seen.add(dedupKey);
      merged.push(item);
    }
  }

  merged.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return merged;
};

export const markNotificationAsRead = async (
  notificationId: string,
  userId?: string,
) => {
  try {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);
  } catch (err) {
    console.warn("Error marking notification as read in Supabase:", err);
  }

  if (userId) {
    try {
      const key = `tgd_notifications_${userId}`;
      const stored: NotificationItem[] = JSON.parse(
        localStorage.getItem(key) || "[]",
      );
      const updated = stored.map((item) =>
        item.id === notificationId ? { ...item, is_read: true } : item,
      );
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {}
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("notifications_updated", {
        detail: { notificationId, userId },
      }),
    );
  }
};

export const markAllNotificationsAsRead = async (userId: string) => {
  try {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId);
  } catch (err) {
    console.warn("Error marking all notifications as read in Supabase:", err);
  }

  try {
    const key = `tgd_notifications_${userId}`;
    const stored: NotificationItem[] = JSON.parse(
      localStorage.getItem(key) || "[]",
    );
    const updated = stored.map((item) => ({ ...item, is_read: true }));
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("notifications_updated", { detail: { userId } }),
    );
  }
};

export const deleteNotification = async (
  notificationId: string,
  userId: string,
) => {
  if (!notificationId.trim()) {
    throw new Error("Notification id is required.");
  }
  if (!userId?.trim()) {
    throw new Error("User id is required to delete a notification.");
  }

  const ownerId = userId.trim();
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("user_id", ownerId);
  if (error) {
    throw new Error(`Could not delete notification: ${error.message}`);
  }

  try {
    const key = `tgd_notifications_${ownerId}`;
    const stored: NotificationItem[] = JSON.parse(
      localStorage.getItem(key) || "[]",
    );
    const filtered = stored.filter((item) => item.id !== notificationId);
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch (err) {
    console.warn(
      "Could not update the notification cache after deletion:",
      err,
    );
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("notifications_updated", {
        detail: { notificationId, userId: ownerId },
      }),
    );
  }
};

export const getAdminTransactions = async () => {
  try {
    const { data: txs, error } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !txs) return [];

    const userIds = Array.from(
      new Set(
        txs.flatMap((t) => [t.from_user_id, t.to_creator_id]).filter(Boolean),
      ),
    );
    const userMap = new Map<string, { name: string; email: string }>();

    if (userIds.length > 0) {
      const { data: usersData } = await supabase.from("users").select("*");

      (usersData || []).forEach((u: any) => {
        if (u.uid) userMap.set(u.uid, { name: u.name, email: u.email });
        if (u.id) userMap.set(u.id, { name: u.name, email: u.email });
      });
    }

    return txs.map((t) => {
      const fromUser = userMap.get(t.from_user_id);
      const toCreator = userMap.get(t.to_creator_id);
      return {
        id: (t.reference_id || t.id).substring(0, 10).toUpperCase(),
        user: fromUser?.name || "Fan / Subscriber",
        creator: toCreator?.name || "Creator",
        method: getPaymentMethodLabel(t.type, t.reference_id),
        amount: `KES ${(t.gross_amount || 0).toLocaleString()}`,
        fee: `KES ${(t.platform_fee || 0).toLocaleString()}`,
        net: `KES ${(t.net_amount || 0).toLocaleString()}`,
        rawGross: Number(t.gross_amount || 0),
        rawFee: Number(t.platform_fee || 0),
        rawNet: Number(t.net_amount || 0),
        status: t.status === "completed" ? "success" : t.status || "success",
        date: new Date(t.created_at).toLocaleDateString("en-KE", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    });
  } catch (e) {
    console.error("Error fetching Admin transactions:", e);
    return [];
  }
};

// ========================
// 12. LIVE CHAT & MESSAGING
// ========================

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  creator_id: string;
  sender_role: "subscriber" | "creator";
  content: string;
  media_url?: string;
  is_ppv?: boolean;
  ppv_price?: number;
  ppv_unlocked?: boolean;
  read?: boolean;
  created_at: string;
}

export interface ChatParticipant {
  id: string;
  name: string;
  avatar: string;
  handle?: string;
  role: "creator" | "subscriber";
  isOnline?: boolean;
  last_seen?: string | null;
  isSubscribed?: boolean;
  subscriptionExpiresAt?: string;
  subscriptionTier?: string;
  monthly_price?: number;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

/**
 * Sends a direct message with strict anti-circumvention:
 * Strips all literal digits [0-9] from the content.
 */
export const sendChatMessage = async (params: {
  sender_id: string;
  receiver_id: string;
  creator_id: string;
  sender_role: "subscriber" | "creator";
  content: string;
  media_url?: string;
  is_ppv?: boolean;
  ppv_price?: number;
  ppv_unlocked?: boolean;
}): Promise<ChatMessage> => {
  // Check if sender is suspended
  try {
    const { data: senderUser } = await supabase
      .from("users")
      .select("status")
      .eq("uid", params.sender_id)
      .maybeSingle();
    if (senderUser?.status === "suspended" || senderUser?.status === "banned") {
      throw new Error(
        "Your account is currently suspended and cannot send messages.",
      );
    }
  } catch (checkErr: any) {
    if (checkErr?.message?.includes("suspended")) throw checkErr;
  }

  // Strip all digits to prevent sharing of phone numbers
  const sanitizedContent = (params.content || "").replace(/[0-9]/g, "").trim();

  const fanId =
    params.sender_role === "subscriber" ? params.sender_id : params.receiver_id;
  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    sender_id: params.sender_id,
    receiver_id: params.receiver_id,
    creator_id: params.creator_id,
    sender_role: params.sender_role,
    content: sanitizedContent,
    media_url: params.media_url,
    is_ppv: !!params.is_ppv,
    ppv_price: params.ppv_price || 0,
    ppv_unlocked: !!params.ppv_unlocked,
    read: false,
    created_at: new Date().toISOString(),
  };

  // 1. Persist to Supabase if available
  try {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: newMsg.sender_id,
        receiver_id: newMsg.receiver_id,
        creator_id: newMsg.creator_id,
        sender_role: newMsg.sender_role,
        content: newMsg.content,
        media_url: newMsg.media_url,
        is_ppv: newMsg.is_ppv,
        ppv_price: newMsg.ppv_price,
        ppv_unlocked: newMsg.ppv_unlocked,
        read: newMsg.read,
      })
      .select()
      .maybeSingle();

    if (!error && data?.id) {
      newMsg.id = data.id;
    }
  } catch (err) {
    // Non-fatal, local fallback keeps real-time chatting functional
  }

  // 2. Persist to LocalStorage for reliable local fallback
  try {
    const storageKey = `tgd_chat_${params.creator_id}_${fanId}`;
    const raw = localStorage.getItem(storageKey);
    const list: ChatMessage[] = raw ? JSON.parse(raw) : [];
    list.push(newMsg);
    localStorage.setItem(storageKey, JSON.stringify(list));
  } catch {}

  // 3. Dispatch local event for real-time reactive UI update across components
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("tgd_new_message", { detail: newMsg }),
    );
  }

  // 4. Notify recipient of incoming message
  try {
    if (newMsg.receiver_id && newMsg.receiver_id !== newMsg.sender_id) {
      let senderName =
        newMsg.sender_role === "creator" ? "Creator" : "Subscriber";
      let senderAvatar: string | undefined = undefined;
      const { data: senderUser } = await supabase
        .from("users")
        .select("name, avatar")
        .eq("uid", newMsg.sender_id)
        .maybeSingle();
      if (senderUser?.name) senderName = senderUser.name;
      if (senderUser?.avatar) senderAvatar = senderUser.avatar;

      const snippet = newMsg.content
        ? newMsg.content.length > 60
          ? `${newMsg.content.slice(0, 60)}...`
          : newMsg.content
        : newMsg.is_ppv
          ? "Sent you private media"
          : "Sent you a message";

      const chatLink =
        newMsg.sender_role === "creator"
          ? "/user/messages"
          : `/messages?fan=${newMsg.sender_id}`;

      await createNotification(newMsg.receiver_id, {
        title: `New Message from ${senderName} 💬`,
        message: `"${snippet}"`,
        type: "creator",
        link: chatLink,
        avatar: senderAvatar,
        action_label: "Reply in Chat",
        action_url: chatLink,
        badge: "Direct Message",
      });
    }
  } catch (msgNotifErr) {
    console.warn("Could not dispatch message notification:", msgNotifErr);
  }

  return newMsg;
};

export interface MassPPVMessageParams {
  creator_id: string;
  content: string;
  media_url: string;
  media_type?: "image" | "video";
  ppv_price: number;
  target_audience?: "all" | "recent_tippers" | "active_subscribers";
  custom_recipient_ids?: string[];
  preview_teaser_url?: string;
}

export interface MassPPVMessageResult {
  success: boolean;
  campaign_id: string;
  totalRecipients: number;
  sentCount: number;
  potentialRevenue: number;
  recipients: Array<{ id: string; name: string; avatar?: string }>;
}

/**
 * Retrieves audience segments for a creator's mass PPV broadcast.
 */
export const getCreatorBroadcastAudience = async (creatorId: string) => {
  const fans = await getCreatorChatConversations(creatorId);

  // Group into segments
  const activeSubscribers = fans.filter(
    (f) => f.role === "subscriber" || Boolean((f as any).isSubscribed),
  );

  const tippers = fans.filter((f) => {
    try {
      const local =
        typeof window !== "undefined"
          ? localStorage.getItem(`tgd_fan_tipped_${f.id}_${creatorId}`)
          : null;
      return Boolean(local);
    } catch {
      return false;
    }
  });

  return {
    all: fans,
    activeSubscribers: activeSubscribers.length > 0 ? activeSubscribers : fans,
    topTippers:
      tippers.length > 0
        ? tippers
        : fans.slice(0, Math.max(1, Math.ceil(fans.length / 2))),
    recentChats: fans.filter((f) => Boolean(f.lastMessage)),
  };
};

/**
 * Dispatches a Pay-Per-View message simultaneously to multiple fans (Mass PPV Blast)
 * following the OnlyFans fan-out architecture pattern.
 */
export const sendMassPPVMessage = async (
  params: MassPPVMessageParams,
): Promise<MassPPVMessageResult> => {
  if (!params.creator_id) {
    throw new Error("Creator ID is required for mass PPV dispatch.");
  }
  if (!params.media_url) {
    throw new Error(
      "A media photo or video is required for a Pay-Per-View drop.",
    );
  }

  const cleanPrice = Math.max(100, Math.round(Number(params.ppv_price) || 500));
  const rawCaption = (params.content || "Exclusive private PPV drop 💋").trim();
  const sanitizedContent =
    rawCaption.replace(/[0-9]/g, "").trim() || "Exclusive private PPV drop 💋";
  const campaignId = `camp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // 1. Resolve recipients
  const audience = await getCreatorBroadcastAudience(params.creator_id);
  let targetFans = audience.all;

  if (params.custom_recipient_ids && params.custom_recipient_ids.length > 0) {
    const idSet = new Set(params.custom_recipient_ids);
    const matched = audience.all.filter((f) => idSet.has(f.id));
    const matchedIds = new Set(matched.map((f) => f.id));
    const extra: ChatParticipant[] = params.custom_recipient_ids
      .filter((id) => !matchedIds.has(id))
      .map((id) => ({
        id,
        name: `Subscriber`,
        avatar: "",
        role: "subscriber",
      }));
    targetFans = [...matched, ...extra];
  } else if (params.target_audience === "active_subscribers") {
    targetFans = audience.activeSubscribers;
  } else if (params.target_audience === "recent_tippers") {
    targetFans = audience.topTippers;
  }

  // Ensure unique fans
  const uniqueFansMap = new Map<string, (typeof targetFans)[0]>();
  targetFans.forEach((f) => {
    if (f.id && f.id !== params.creator_id) {
      uniqueFansMap.set(f.id, f);
    }
  });
  const recipients = Array.from(uniqueFansMap.values());

  // 2. Dispatch to each recipient fan concurrently (OnlyFans parallel fan-out architecture)
  const results = await Promise.all(
    recipients.map(async (fan) => {
      try {
        return await sendChatMessage({
          sender_id: params.creator_id,
          receiver_id: fan.id,
          creator_id: params.creator_id,
          sender_role: "creator",
          content: sanitizedContent,
          media_url: params.media_url,
          is_ppv: true,
          ppv_price: cleanPrice,
          ppv_unlocked: false,
        });
      } catch (sendErr) {
        console.warn(`Failed sending mass PPV to fan ${fan.id}:`, sendErr);
        return null;
      }
    }),
  );
  const sentMessages: ChatMessage[] = results.filter((m): m is ChatMessage =>
    Boolean(m),
  );

  // 3. Record campaign log in creator's history
  if (typeof window !== "undefined") {
    try {
      const historyKey = `tgd_creator_mass_campaigns_${params.creator_id}`;
      const raw = localStorage.getItem(historyKey);
      const existing = raw ? JSON.parse(raw) : [];
      existing.unshift({
        id: campaignId,
        created_at: new Date().toISOString(),
        caption: sanitizedContent,
        media_url: params.media_url,
        media_type: params.media_type || "image",
        ppv_price: cleanPrice,
        recipients_count: recipients.length,
        potential_revenue: recipients.length * cleanPrice,
        status: "delivered",
      });
      localStorage.setItem(historyKey, JSON.stringify(existing.slice(0, 50)));

      // Dispatch global event for live broadcast counter
      window.dispatchEvent(
        new CustomEvent("tgd_mass_broadcast_sent", {
          detail: {
            campaign_id: campaignId,
            recipients_count: recipients.length,
            price: cleanPrice,
            caption: sanitizedContent,
          },
        }),
      );
    } catch {}
  }

  return {
    success: true,
    campaign_id: campaignId,
    totalRecipients: recipients.length,
    sentCount: sentMessages.length,
    potentialRevenue: recipients.length * cleanPrice,
    recipients: recipients.map((r) => ({
      id: r.id,
      name: r.name,
      avatar: r.avatar,
    })),
  };
};

/**
 * Loads messages between a creator and a fan.
 */
export const getChatMessages = async (
  creatorId: string,
  fanId: string,
): Promise<ChatMessage[]> => {
  let messages: ChatMessage[] = [];
  const cleanCreatorId = (creatorId || "").replace(/[^a-zA-Z0-9_-]/g, "");
  const cleanFanId = (fanId || "").replace(/[^a-zA-Z0-9_-]/g, "");
  if (!cleanCreatorId || !cleanFanId) return [];

  // 1. Try Supabase
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("creator_id", cleanCreatorId)
      .or(`sender_id.eq.${cleanFanId},receiver_id.eq.${cleanFanId}`)
      .order("created_at", { ascending: true });

    if (!error && data && data.length > 0) {
      messages = data.map((m: any) => ({
        id: m.id,
        sender_id: m.sender_id,
        receiver_id: m.receiver_id,
        creator_id: m.creator_id,
        sender_role:
          m.sender_role ||
          (m.sender_id === creatorId ? "creator" : "subscriber"),
        content: m.content || "",
        media_url: m.media_url,
        is_ppv: !!m.is_ppv,
        ppv_price: m.ppv_price,
        ppv_unlocked: !!m.ppv_unlocked,
        read: !!m.read,
        created_at: m.created_at,
      }));
    }
  } catch {}

  // 2. Merge with LocalStorage fallback
  try {
    const storageKey = `tgd_chat_${creatorId}_${fanId}`;
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const localMsgs: ChatMessage[] = JSON.parse(raw);
      const existingIds = new Set(messages.map((m) => m.id));
      for (const lm of localMsgs) {
        if (!existingIds.has(lm.id)) {
          messages.push(lm);
          existingIds.add(lm.id);
        }
      }
      messages.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    }
  } catch {}

  return messages;
};

/**
 * Creates an automated personalized welcome message from the creator
 * into the chat thread with a new subscriber.
 */
export const createAutomatedWelcomeMessage = async (
  creatorId: string,
  fanId: string,
  creatorName?: string,
) => {
  const welcomeKey = `tgd_welcomed_${creatorId}_${fanId}`;
  if (typeof window !== "undefined" && localStorage.getItem(welcomeKey)) {
    return; // Already welcomed
  }

  // Check creator's custom automations settings
  let welcomeContent = `Hey! 🥰 Welcome to ${creatorName || "my"} direct chat! Feel free to text me here anytime!`;
  let isLocked = false;
  let ppvPrice: number | undefined = undefined;

  if (typeof window !== "undefined") {
    try {
      const rawAuto = localStorage.getItem(
        `tgd_creator_automations_${creatorId}`,
      );
      if (rawAuto) {
        const auto = JSON.parse(rawAuto);
        if (auto.enabled === false) {
          return; // Creator paused automations
        }
        if (auto.messageText?.trim()) {
          welcomeContent = auto.messageText.trim();
        }
        if (auto.hasPpv && auto.ppvPrice) {
          isLocked = true;
          ppvPrice = Number(auto.ppvPrice);
        }
      }
    } catch {}
  }

  await sendChatMessage({
    sender_id: creatorId,
    receiver_id: fanId,
    creator_id: creatorId,
    sender_role: "creator",
    content: welcomeContent,
    is_ppv: isLocked,
    ppv_price: ppvPrice,
  });

  if (typeof window !== "undefined") {
    localStorage.setItem(welcomeKey, "true");
  }
};

/**
 * Unlocks a locked PPV message in the chat
 */
export const unlockChatMessagePPV = async (
  messageId: string,
  creatorId: string,
  fanId: string,
) => {
  try {
    await supabase
      .from("messages")
      .update({ ppv_unlocked: true })
      .eq("id", messageId);
  } catch {}

  try {
    const storageKey = `tgd_chat_${creatorId}_${fanId}`;
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const list: ChatMessage[] = JSON.parse(raw);
      const updated = list.map((m) =>
        m.id === messageId ? { ...m, ppv_unlocked: true } : m,
      );
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("tgd_message_unlocked", { detail: { messageId } }),
    );
  }
};

/**
 * Retrieves the list of creator conversations for a fan/user.
 */
export const getUserChatConversations = async (
  userId: string,
): Promise<ChatParticipant[]> => {
  const conversationsMap = new Map<string, ChatParticipant>();

  // 1. Check active subscriptions in Supabase
  try {
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("creator_id, tier_name, status, expires_at")
      .eq("fan_id", userId)
      .eq("status", "active");

    if (subs) {
      for (const s of subs) {
        if (!conversationsMap.has(s.creator_id)) {
          const profile = await getCreatorProfile(s.creator_id);
          const pAny = profile as any;
          conversationsMap.set(s.creator_id, {
            id: s.creator_id,
            name: profile?.name || "Creator",
            avatar: resolveUserAvatar(profile?.avatar, profile?.name),
            handle:
              pAny?.handle ||
              `@${(profile?.name || "creator").toLowerCase().replace(/\s+/g, "")}`,
            role: "creator",
            isOnline: true,
            last_seen: pAny?.last_seen || getUserLastSeen(s.creator_id) || null,
            isSubscribed: true,
            subscriptionExpiresAt: s.expires_at,
            subscriptionTier: s.tier_name || "VIP Tier",
            monthly_price: pAny?.monthly_price || 1000,
          });
        }
      }
    }
  } catch {}

  // 2. Check local subscriptions & local chats
  if (typeof window !== "undefined") {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`tgd_sub_${userId}_`)) {
          const creatorId = key.replace(`tgd_sub_${userId}_`, "");
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (
              parsed.status === "active" &&
              !conversationsMap.has(creatorId)
            ) {
              const profile = await getCreatorProfile(creatorId);
              const pAny = profile as any;
              conversationsMap.set(creatorId, {
                id: creatorId,
                name: profile?.name || "Creator",
                avatar: resolveUserAvatar(profile?.avatar, profile?.name),
                handle:
                  pAny?.handle ||
                  `@${(profile?.name || "creator").toLowerCase().replace(/\s+/g, "")}`,
                role: "creator",
                isOnline: true,
                last_seen:
                  pAny?.last_seen || getUserLastSeen(creatorId) || null,
                isSubscribed: true,
                subscriptionExpiresAt: parsed.expires_at,
                subscriptionTier: parsed.tier_name || "VIP Tier",
                monthly_price: pAny?.monthly_price || 1000,
              });
            }
          }
        } else if (key && key.startsWith("tgd_chat_")) {
          const parts = key.replace("tgd_chat_", "").split("_");
          if (parts.length >= 2) {
            const creatorId = parts[0];
            const fanId = parts[1];
            if (fanId === userId && !conversationsMap.has(creatorId)) {
              const profile = await getCreatorProfile(creatorId);
              const pAny = profile as any;
              const sub = await checkUserSubscription(userId, creatorId);
              conversationsMap.set(creatorId, {
                id: creatorId,
                name: profile?.name || "Creator",
                avatar: resolveUserAvatar(profile?.avatar, profile?.name),
                handle:
                  pAny?.handle ||
                  `@${(profile?.name || "creator").toLowerCase().replace(/\s+/g, "")}`,
                role: "creator",
                isOnline: true,
                last_seen:
                  pAny?.last_seen || getUserLastSeen(creatorId) || null,
                isSubscribed: !!sub,
                subscriptionExpiresAt: sub?.expires_at,
                subscriptionTier: sub?.tier_name,
                monthly_price: pAny?.monthly_price || 1000,
              });
            }
          }
        }
      }
    } catch {}
  }

  // 3. For each conversation, fetch the last message snippet
  const list = Array.from(conversationsMap.values());
  for (const c of list) {
    const msgs = await getChatMessages(c.id, userId);
    if (msgs.length > 0) {
      const last = msgs[msgs.length - 1];
      c.lastMessage = last.is_ppv ? "🔒 Locked Exclusive PPV" : last.content;
      c.lastMessageTime = last.created_at;
    } else {
      c.lastMessage = c.isSubscribed
        ? "Connected! Send your first message."
        : "Subscribe to start 1-on-1 chatting";
    }
  }

  // 4. Default popular creators if the list is empty (so fan sees creators to subscribe & chat with)
  if (list.length === 0) {
    const defaults = [
      {
        id: "creator-wairimu",
        name: "Wairimu K. ✨",
        avatar:
          "https://i.pinimg.com/736x/be/39/5d/be395de0b5e63dea55bf6be0bd00a548.jpg",
        handle: "@wairimuk",
        price: 1000,
      },
      {
        id: "creator-chebet",
        name: "Chebet Fit & Spice 🔥",
        avatar:
          "https://i.pinimg.com/736x/63/d3/79/63d3791235f63c60e78d9a868b6bea67.jpg",
        handle: "@chebetfit",
        price: 1200,
      },
    ];
    for (const d of defaults) {
      const sub = await checkUserSubscription(userId, d.id);
      list.push({
        id: d.id,
        name: d.name,
        avatar: d.avatar,
        handle: d.handle,
        role: "creator",
        isOnline: true,
        isSubscribed: !!sub,
        monthly_price: d.price,
        lastMessage: sub
          ? "Connected! Send a message"
          : "Subscribe to start chatting",
      });
    }
  }

  return list;
};

/**
 * Retrieves the list of fan/subscriber conversations for a creator.
 */
export const getCreatorChatConversations = async (
  creatorId: string,
): Promise<ChatParticipant[]> => {
  const fansMap = new Map<string, ChatParticipant>();

  // 1. Check subscriptions from Supabase
  try {
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("fan_id, tier_name, status, created_at, expires_at")
      .eq("creator_id", creatorId)
      .eq("status", "active");

    if (subs) {
      for (const s of subs) {
        if (!fansMap.has(s.fan_id)) {
          const userProfile = await getUserProfile(s.fan_id);
          fansMap.set(s.fan_id, {
            id: s.fan_id,
            name: userProfile?.name || "Fan",
            avatar: resolveUserAvatar(userProfile?.avatar, userProfile?.name),
            role: "subscriber",
            isOnline: true,
            last_seen:
              (userProfile as any)?.last_seen ||
              getUserLastSeen(s.fan_id) ||
              null,
            isSubscribed: true,
            subscriptionExpiresAt: s.expires_at,
            subscriptionTier: s.tier_name || "VIP Tier",
          });
        }
      }
    }
  } catch {}

  // 2. Check local subscribers and local chats
  if (typeof window !== "undefined") {
    try {
      const rawFans = localStorage.getItem(`tgd_fans_${creatorId}`);
      if (rawFans) {
        const fansList = JSON.parse(rawFans);
        for (const f of fansList) {
          if (!fansMap.has(f.id)) {
            fansMap.set(f.id, {
              id: f.id,
              name: f.name || "Fan",
              avatar: resolveUserAvatar(f.avatar, f.name),
              role: "subscriber",
              isOnline: true,
              last_seen: getUserLastSeen(f.id) || null,
              isSubscribed: true,
              subscriptionTier: f.tier || "VIP Tier",
            });
          }
        }
      }

      // Check localStorage for chat keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`tgd_chat_${creatorId}_`)) {
          const fanId = key.replace(`tgd_chat_${creatorId}_`, "");
          if (!fansMap.has(fanId)) {
            const userProfile = await getUserProfile(fanId);
            const sub = await checkUserSubscription(fanId, creatorId);
            fansMap.set(fanId, {
              id: fanId,
              name: userProfile?.name || "Subscriber",
              avatar: resolveUserAvatar(userProfile?.avatar, userProfile?.name),
              role: "subscriber",
              isOnline: true,
              last_seen:
                (userProfile as any)?.last_seen ||
                getUserLastSeen(fanId) ||
                null,
              isSubscribed: !!sub,
              subscriptionTier: sub?.tier_name || "Active Subscriber",
            });
          }
        }
      }
    } catch {}
  }

  // 3. Attach last message preview
  const list = Array.from(fansMap.values());
  for (const fan of list) {
    const msgs = await getChatMessages(creatorId, fan.id);
    if (msgs.length > 0) {
      const last = msgs[msgs.length - 1];
      fan.lastMessage = last.is_ppv ? "Sent locked PPV media" : last.content;
      fan.lastMessageTime = last.created_at;
    } else {
      fan.lastMessage = "New subscriber joined your channel!";
    }
  }

  // Default fans if creator is new (so inbox isn't completely empty before first live fan)
  if (list.length === 0) {
    list.push(
      {
        id: "fan-alex-101",
        name: "Alex M.",
        avatar:
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
        role: "subscriber",
        isOnline: true,
        isSubscribed: true,
        subscriptionTier: "VIP Tier",
        lastMessage: "Loved your latest post! Any custom videos coming?",
      },
      {
        id: "fan-kevin-102",
        name: "Kevin O.",
        avatar:
          "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
        role: "subscriber",
        isOnline: false,
        isSubscribed: true,
        subscriptionTier: "VIP Tier",
        lastMessage: "Thanks for the quick reply! 🔥",
      },
    );
  }

  return list;
};

// ========================
// 12. PLATFORM ADS & CAMPAIGNS (ADMIN, USER & CREATOR)
// ========================

export interface PlatformAd {
  id: string;
  title: string;
  description: string;
  image_url: string;
  target_audience: "all" | "users" | "creators";
  category:
    | "luxury"
    | "hospitality"
    | "nightlife"
    | "sponsorship"
    | "brand_deal"
    | "creator_perk"
    | "lifestyle"
    | "company"
    | "creator_spotlight";
  sponsor_name: string;
  sponsor_logo?: string;
  badge?: string;
  perk_value?: string;
  cta_text: string;
  cta_url: string;
  requirements?: string[];
  status: "active" | "paused" | "archived";
  impressions: number;
  clicks: number;
  created_at: string;
  expires_at?: string;
  created_by?: string;
  // Creator & Company Promotion fields
  ad_type?: "company" | "creator";
  creator_id?: string;
  creator_name?: string;
  creator_avatar?: string | null;
  creator_handle?: string;
  price_paid?: number; // In KES paid to admin/company
  duration_days?: number;
}

export interface CreatorAdOrder {
  id: string;
  creator_id: string;
  creator_name: string;
  creator_avatar?: string | null;
  creator_handle?: string;
  title: string;
  description: string;
  image_url: string;
  package_name: string;
  duration_days: number;
  amount: number;
  phone: string;
  payment_status: "paid" | "pending";
  status: "pending" | "published" | "rejected";
  created_at: string;
  published_ad_id?: string;
}

export interface AdApplication {
  id: string;
  ad_id: string;
  creator_id: string;
  creator_name: string;
  creator_handle: string;
  pitch: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export const DEFAULT_PLATFORM_ADS: PlatformAd[] = [
  {
    id: "ad-user-1",
    title: "VIP Nairobi Hideaway Restore Club",
    description:
      "Exclusive weekend tasting access and 20% privilege dining discount for The Gents DollHouse VIP members. Present your digital badge upon arrival.",
    image_url:
      "https://i.pinimg.com/736x/41/6d/31/416d318e49d9ea17342082b9f0a6b0f7.jpg",
    target_audience: "users",
    category: "nightlife",
    sponsor_name: "The Onyx Club & Lounge",
    badge: "VIP Exclusive",
    perk_value: "20% Privilege Discount",
    cta_text: "Claim Reservation Code",
    cta_url: "https://example.com/onyx-lounge",
    status: "active",
    impressions: 485,
    clicks: 74,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
  {
    id: "ad-user-2",
    title: "Private Luxury  Spa and Happy ending Retreat",
    description:
      "Book 3 nights and receive complimentary helicopter transfer plus personal chef service. Exclusive platform partnership for registered patrons.",
    image_url:
      "https://i.pinimg.com/1200x/98/07/ce/9807ce9073de2f3e431ddb98be26eb3b.jpg",
    target_audience: "users",
    category: "luxury",
    sponsor_name: "Sultan Palace Escapes",
    badge: "Limited Privilege",
    perk_value: "Free Heli Transfer",
    cta_text: "Explore Private Villa",
    cta_url: "https://example.com/diani-villa",
    status: "active",
    impressions: 612,
    clicks: 118,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45).toISOString(),
  },
  {
    id: "ad-all-3",
    title: "Moët & Chandon Imperial Reserve Gifting",
    description:
      "Order customized luxury champagne gift boxes delivered discreetly anywhere in Nairobi with handwritten wax-sealed letters.",
    image_url:
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80",
    target_audience: "all",
    category: "lifestyle",
    sponsor_name: "Maison Luxe Spirits",
    badge: "Partner Special",
    perk_value: "Free Luxury Box & Courier",
    cta_text: "Order Discreet Gift",
    cta_url: "https://example.com/luxe-spirits",
    status: "active",
    impressions: 340,
    clicks: 52,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString(),
  },
  {
    id: "ad-creator-1",
    title: "High-Fashion Lingerie & Silk Seasonal Campaign",
    description:
      "Selected creators receive complimentary seasonal luxury silk sets valued at KES 45,000 plus KES 35,000 upfront fee for 1 verified photo feature.",
    image_url:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
    target_audience: "creators",
    category: "brand_deal",
    sponsor_name: "Amore Silks Nairobi",
    badge: "Paid Sponsorship",
    perk_value: "KES 35,000 + Wardrobe",
    requirements: [
      "1 High-res Feed Post",
      "2 24h Story Highlights",
      "Tag @AmoreSilks",
    ],
    cta_text: "Apply for Brand Deal",
    cta_url: "#apply",
    status: "active",
    impressions: 520,
    clicks: 138,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20).toISOString(),
  },
  {
    id: "ad-creator-2",
    title: "Complimentary 4K Studio & Lighting Residency",
    description:
      "Free 4-hour bookings at Nairobi Westlands Creator Loft with Sony FX3 cinematic cameras, cinema lenses, pro strobe lighting, and makeup suite.",
    image_url:
      "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80",
    target_audience: "creators",
    category: "creator_perk",
    sponsor_name: "Westlands Media Studios",
    badge: "Creator Studio Perk",
    perk_value: "100% Free Booking",
    requirements: [
      "Verified Creator status on The Gents DollHouse",
      "Advance 48h calendar booking",
    ],
    cta_text: "Reserve Studio Slot",
    cta_url: "#book-studio",
    status: "active",
    impressions: 410,
    clicks: 94,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(),
  },
  {
    id: "ad-creator-3",
    title: "Luxury Yacht Content Shoot Weekend (Mombasa)",
    description:
      "All-expenses-paid 2-day catamaran cruise shoot along the Swahili coastline. Selected creators receive KES 75,000 honorarium and full royalty rights.",
    image_url:
      "https://images.unsplash.com/photo-1569263979104-865ab7cd8d17?auto=format&fit=crop&w=1200&q=80",
    target_audience: "creators",
    category: "sponsorship",
    sponsor_name: "Coastline Catamarans",
    badge: "High-Tier Deal",
    perk_value: "KES 75,000 Honorarium",
    requirements: [
      "Active creator channel with VIP tier",
      "Professional demeanor & portfolio link",
    ],
    cta_text: "Submit Application",
    cta_url: "#apply-yacht",
    status: "active",
    impressions: 742,
    clicks: 189,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
  },
  {
    id: "ad-creator-wairimu",
    ad_type: "creator",
    creator_id: "creator-wairimu",
    creator_name: "Wairimu K. ✨",
    creator_avatar:
      "https://i.pinimg.com/736x/be/39/5d/be395de0b5e63dea55bf6be0bd00a548.jpg",
    creator_handle: "@wairimuk",
    title: "Featured Creator: Wairimu K. ✨",
    description:
      "Catch exclusive swimwear shoots, Nairobi nightlife diary, and nightly VIP live broadcasts. Subscribe now to unlock her full private feed!",
    image_url:
      "https://i.pinimg.com/736x/be/39/5d/be395de0b5e63dea55bf6be0bd00a548.jpg",
    target_audience: "users",
    category: "creator_spotlight",
    sponsor_name: "Wairimu K. Spotlight",
    badge: "Sponsored Creator",
    perk_value: "KES 1,000/mo Access",
    cta_text: "View Profile & Subscribe",
    cta_url: "/creator/creator-wairimu",
    status: "active",
    impressions: 1240,
    clicks: 342,
    price_paid: 2500,
    duration_days: 14,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 13).toISOString(),
  },
  {
    id: "ad-creator-chebet",
    ad_type: "creator",
    creator_id: "creator-chebet",
    creator_name: "Chebet Fit & Spice 🔥",
    creator_avatar:
      "https://i.pinimg.com/736x/63/d3/79/63d3791235f63c60e78d9a868b6bea67.jpg",
    creator_handle: "@chebetfit",
    title: "Featured Creator: Chebet Fit & Spice 🔥",
    description:
      "High-energy fitness workouts, spicy Swahili culinary delights, and private interactive broadcasts. Join her VIP community today!",
    image_url:
      "https://i.pinimg.com/736x/63/d3/79/63d3791235f63c60e78d9a868b6bea67.jpg",
    target_audience: "users",
    category: "creator_spotlight",
    sponsor_name: "Chebet Fit Promo",
    badge: "Trending Creator",
    perk_value: "KES 1,200/mo Access",
    cta_text: "View Profile & Subscribe",
    cta_url: "/creator/creator-chebet",
    status: "active",
    impressions: 980,
    clicks: 215,
    price_paid: 1800,
    duration_days: 7,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: "ad-company-official",
    ad_type: "company",
    title: "The Gents DollHouse Official VIP Pass",
    description:
      "Elevate your membership with unrestricted 24/7 access to all verified Kenyan creators, HD live streams, and bespoke escort directory privileges.",
    image_url:
      "https://i.pinimg.com/736x/0a/34/ae/0a34ae553f30d611f2401bb0174ed46b.jpg",
    target_audience: "all",
    category: "company",
    sponsor_name: "The Gents DollHouse Official",
    badge: "Platform Spotlight",
    perk_value: "Instant Access",
    cta_text: "Discover All Creators",
    cta_url: "/discover",
    status: "active",
    impressions: 2480,
    clicks: 614,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(),
  },
];

const ADS_STORAGE_KEY = "tgd_platform_ads";
const AD_APPLICATIONS_KEY = "tgd_ad_applications";
const CREATOR_AD_ORDERS_KEY = "tgd_creator_ad_orders";

export const getCreatorAdOrders = async (): Promise<CreatorAdOrder[]> => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CREATOR_AD_ORDERS_KEY);
    if (!raw) {
      const sampleOrders: CreatorAdOrder[] = [
        {
          id: "order-sample-1",
          creator_id: "creator-wairimu",
          creator_name: "Wairimu K. ✨",
          creator_avatar:
            "https://i.pinimg.com/736x/be/39/5d/be395de0b5e63dea55bf6be0bd00a548.jpg",
          creator_handle: "@wairimuk",
          title: "Promote My New VIP Swimwear Shoot",
          description:
            "Special weekend feature for all Nairobi subscribers with 15% discount for first 50 subscribers.",
          image_url:
            "https://i.pinimg.com/736x/be/39/5d/be395de0b5e63dea55bf6be0bd00a548.jpg",
          package_name: "7 Days VIP Feature",
          duration_days: 7,
          amount: 1500,
          phone: "0712345678",
          payment_status: "paid",
          status: "pending",
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        },
      ];
      localStorage.setItem(CREATOR_AD_ORDERS_KEY, JSON.stringify(sampleOrders));
      return sampleOrders;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const createCreatorAdOrder = async (
  order: Omit<CreatorAdOrder, "id" | "created_at">,
): Promise<CreatorAdOrder> => {
  const newOrder: CreatorAdOrder = {
    ...order,
    id: generateAdUUID(),
    created_at: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      const current = await getCreatorAdOrders();
      const updated = [newOrder, ...current];
      localStorage.setItem(CREATOR_AD_ORDERS_KEY, JSON.stringify(updated));
      window.dispatchEvent(
        new CustomEvent("tgd_ad_orders_updated", {
          detail: { count: updated.length },
        }),
      );

      // Also create an admin notification alert
      notifyAdmins({
        title: `Paid Ad Promotion: ${order.creator_name} 🚀`,
        message: `${order.creator_name} paid KES ${order.amount.toLocaleString()} for ${order.package_name}. Review and publish this ad for all subscribers to see!`,
        type: "system",
        badge: "Ad Order Payment",
        action_url: "/admin/ads",
        payment_details: {
          gross_amount: order.amount,
          platform_fee: 0,
          net_amount: order.amount,
          payer_name: order.creator_name,
          recipient_name: "Platform Ad Promotion",
          currency: "KES",
          creator_name: "Platform Ad Promotion",
          type: "ad_promotion",
          status: "completed",
          payment_method: "M-Pesa",
        },
      }).catch(() => {});
    } catch {}
  }

  return newOrder;
};

export const updateCreatorAdOrderStatus = async (
  id: string,
  status: CreatorAdOrder["status"],
  publishedAdId?: string,
): Promise<boolean> => {
  if (typeof window === "undefined") return false;
  try {
    const current = await getCreatorAdOrders();
    const updated = current.map((o) =>
      o.id === id
        ? {
            ...o,
            status,
            ...(publishedAdId ? { published_ad_id: publishedAdId } : {}),
          }
        : o,
    );
    localStorage.setItem(CREATOR_AD_ORDERS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("tgd_ad_orders_updated"));
    return true;
  } catch {
    return false;
  }
};

export const getStoredAds = (): PlatformAd[] => {
  if (typeof window === "undefined") return DEFAULT_PLATFORM_ADS;
  try {
    const raw = localStorage.getItem(ADS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(
        ADS_STORAGE_KEY,
        JSON.stringify(DEFAULT_PLATFORM_ADS),
      );
      return DEFAULT_PLATFORM_ADS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : DEFAULT_PLATFORM_ADS;
  } catch {
    return DEFAULT_PLATFORM_ADS;
  }
};

export const saveStoredAds = (ads: PlatformAd[]): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(ads));
    window.dispatchEvent(
      new CustomEvent("tgd_ads_updated", { detail: { count: ads.length } }),
    );
  } catch (err) {
    console.error("Failed to save ads locally:", err);
  }
};

/**
 * Fetch platform ads from Supabase with fallback to local store.
 */
export const getPlatformAds = async (
  audience?: "all" | "users" | "creators",
  includeInactive = false,
): Promise<PlatformAd[]> => {
  try {
    let query = supabase
      .from("platform_ads")
      .select("*")
      .order("created_at", { ascending: false });
    if (!includeInactive) {
      query = query.eq("status", "active");
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      const remoteAds = data as PlatformAd[];
      const local = getStoredAds();
      const localOnly = local.filter(
        (l) => !remoteAds.some((r) => r.id === l.id),
      );
      const combined = [...remoteAds, ...localOnly];
      const filtered = includeInactive
        ? combined
        : combined.filter((a) => a.status === "active");
      if (audience && audience !== "all") {
        return filtered.filter(
          (ad) =>
            ad.target_audience === "all" || ad.target_audience === audience,
        );
      }
      return filtered;
    }
  } catch (err) {
    console.warn(
      "Supabase platform_ads query failed, using stored local ads:",
      err,
    );
  }

  // Fallback to local store
  const local = getStoredAds();
  const filtered = includeInactive
    ? local
    : local.filter((a) => a.status === "active");
  if (audience && audience !== "all") {
    return filtered.filter(
      (ad) => ad.target_audience === "all" || ad.target_audience === audience,
    );
  }
  return filtered;
};

const generateAdUUID = (): string => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Create a new platform ad by Admin
 */
export const createPlatformAd = async (
  ad: Omit<PlatformAd, "id" | "impressions" | "clicks" | "created_at">,
): Promise<PlatformAd> => {
  const newAd: PlatformAd = {
    ...ad,
    id: generateAdUUID(),
    impressions: 0,
    clicks: 0,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("platform_ads")
      .insert([newAd])
      .select()
      .maybeSingle();
    if (error) {
      console.warn("Supabase create ad failed:", error);
    } else if (data) {
      const current = getStoredAds();
      saveStoredAds([
        data as PlatformAd,
        ...current.filter((a) => a.id !== data.id),
      ]);
      return data as PlatformAd;
    }
  } catch (err) {
    console.warn("Supabase create ad failed, writing to local cache:", err);
  }

  const current = getStoredAds();
  const updated = [newAd, ...current];
  saveStoredAds(updated);
  return newAd;
};

/**
 * Update an existing ad (toggle status, edit text, etc.)
 */
export const updatePlatformAd = async (
  id: string,
  updates: Partial<PlatformAd>,
): Promise<PlatformAd | null> => {
  try {
    await supabase.from("platform_ads").update(updates).eq("id", id);
  } catch (err) {
    console.warn("Supabase update ad failed:", err);
  }

  const current = getStoredAds();
  const index = current.findIndex((a) => a.id === id);
  if (index === -1) return null;

  const updatedItem = { ...current[index], ...updates };
  current[index] = updatedItem;
  saveStoredAds([...current]);
  return updatedItem;
};

/**
 * Delete a platform ad
 */
export const deletePlatformAd = async (id: string): Promise<boolean> => {
  try {
    await supabase.from("platform_ads").delete().eq("id", id);
  } catch (err) {
    console.warn("Supabase delete ad failed:", err);
  }

  const current = getStoredAds();
  const filtered = current.filter((a) => a.id !== id);
  saveStoredAds(filtered);
  return true;
};

/**
 * Track an impression for an ad
 */
export const trackAdImpression = async (id: string): Promise<void> => {
  if (typeof window === "undefined") return;
  const sessionKey = `tgd_ad_imp_${id}`;
  if (sessionStorage.getItem(sessionKey)) return;
  sessionStorage.setItem(sessionKey, "1");

  try {
    await supabase.rpc("increment_ad_impressions", { ad_id: id });
  } catch {
    // fallback increment in local cache
  }

  const current = getStoredAds();
  const item = current.find((a) => a.id === id);
  if (item) {
    item.impressions = (item.impressions || 0) + 1;
    saveStoredAds([...current]);
  }
};

/**
 * Track a click on an ad
 */
export const trackAdClick = async (id: string): Promise<void> => {
  try {
    await supabase.rpc("increment_ad_clicks", { ad_id: id });
  } catch {
    // fallback increment in local cache
  }

  const current = getStoredAds();
  const item = current.find((a) => a.id === id);
  if (item) {
    item.clicks = (item.clicks || 0) + 1;
    saveStoredAds([...current]);
  }
};

/**
 * Submit an application from a creator for a brand deal
 */
export const applyForCreatorBrandDeal = async (
  adId: string,
  creatorId: string,
  creatorName: string,
  creatorHandle: string,
  pitch: string,
): Promise<AdApplication> => {
  const application: AdApplication = {
    id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ad_id: adId,
    creator_id: creatorId,
    creator_name: creatorName,
    creator_handle: creatorHandle,
    pitch,
    status: "pending",
    created_at: new Date().toISOString(),
  };

  try {
    await supabase.from("ad_applications").insert([application]);
  } catch (err) {
    console.warn("Supabase ad application insert failed:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(AD_APPLICATIONS_KEY);
      const list: AdApplication[] = raw ? JSON.parse(raw) : [];
      list.unshift(application);
      localStorage.setItem(AD_APPLICATIONS_KEY, JSON.stringify(list));
      window.dispatchEvent(
        new CustomEvent("tgd_applications_updated", { detail: application }),
      );
    } catch {}
  }

  return application;
};

/**
 * Get applications submitted by a creator
 */
export const getCreatorBrandDealApplications = async (
  creatorId: string,
): Promise<AdApplication[]> => {
  try {
    const { data } = await supabase
      .from("ad_applications")
      .select("*")
      .eq("creator_id", creatorId)
      .order("created_at", { ascending: false });
    if (data && data.length > 0) return data as AdApplication[];
  } catch {}

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(AD_APPLICATIONS_KEY);
      if (raw) {
        const list: AdApplication[] = JSON.parse(raw);
        return list.filter((a) => a.creator_id === creatorId);
      }
    } catch {}
  }
  return [];
};
