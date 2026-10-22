type PageResult<T> = {
  data: T[] | null;
  error?: unknown;
};

export const fetchAllPages = async <T>(
  fetchPage: (offset: number, pageSize: number) => Promise<PageResult<T>>,
  pageSize = 1000,
): Promise<T[]> => {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError('pageSize must be a positive integer');
  }

  const rows: T[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await fetchPage(offset, pageSize);
    if (error) throw error;
    if (!data) break;

    rows.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return rows;
};
