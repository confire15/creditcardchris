export function buildHouseholdOwnerLabels(memberIds: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  memberIds.forEach((id, index) => {
    map[id] = `P${index + 1}`;
  });
  return map;
}
