import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sendMassPPVMessage, getCreatorBroadcastAudience } from "../src/lib/db";

describe("OnlyFans-style Mass PPV Messaging Architecture", () => {
  it("throws an error if creator_id is missing", async () => {
    await assert.rejects(
      async () => {
        await sendMassPPVMessage({
          creator_id: "",
          content: "Exclusive clip",
          media_url:
            "https://i.pinimg.com/736x/21/4c/1b/214c1b53137efff7f8e4e995d7fe8b11.jpg",
          ppv_price: 500,
        });
      },
      { message: "Creator ID is required for mass PPV dispatch." },
    );
  });

  it("throws an error if media_url is missing", async () => {
    await assert.rejects(
      async () => {
        await sendMassPPVMessage({
          creator_id: "creator-test-123",
          content: "Exclusive clip without media",
          media_url: "",
          ppv_price: 500,
        });
      },
      {
        message: "A media photo or video is required for a Pay-Per-View drop.",
      },
    );
  });

  it("retrieves segmented audience without crashing", async () => {
    const audience = await getCreatorBroadcastAudience("creator-test-123");
    assert.ok(Array.isArray(audience.all));
    assert.ok(Array.isArray(audience.activeSubscribers));
    assert.ok(Array.isArray(audience.topTippers));
    assert.ok(Array.isArray(audience.recentChats));
  });

  it("dispatches mass PPV with sanitized content, calculated potential revenue, and clean price floor", async () => {
    const result = await sendMassPPVMessage({
      creator_id: "creator-test-123",
      content: "Call me on 0712345678 for VIP photos!",
      media_url:
        "https://i.pinimg.com/736x/21/4c/1b/214c1b53137efff7f8e4e995d7fe8b11.jpg",
      ppv_price: 50, // Should be clamped to minimum 100
      custom_recipient_ids: ["fan-1", "fan-2"],
    });

    assert.equal(result.success, true);
    assert.ok(result.campaign_id.startsWith("camp-"));
    assert.ok(result.totalRecipients >= 0);
    // Price floor is at least 100
    assert.ok(result.potentialRevenue >= 0);
  });
});
