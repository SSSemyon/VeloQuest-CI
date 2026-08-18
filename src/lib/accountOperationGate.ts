export type AccountOperationToken = Readonly<{ userId: string; epoch: number }>;

export function captureAccountOperation(userId: string, epoch: number): AccountOperationToken {
  return Object.freeze({ userId, epoch });
}

export function isCurrentAccountOperation(
  token: AccountOperationToken,
  currentUserId: string | null,
  currentEpoch: number,
) {
  return token.userId === currentUserId && token.epoch === currentEpoch;
}

export function nextAccountEpoch(currentUserId: string | null, nextUserId: string | null, currentEpoch: number) {
  return currentUserId === nextUserId ? currentEpoch : currentEpoch + 1;
}
