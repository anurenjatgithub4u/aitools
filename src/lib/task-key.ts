/** Same key format as the server's job `pending` list ("keywordId:country"). */
export const taskKey = (keywordId: number, country: string) => `${keywordId}:${country}`;
