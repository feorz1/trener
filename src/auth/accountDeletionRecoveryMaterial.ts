export async function createAccountDeletionRecoveryMaterial(input: {
  randomUuid: () => string;
  randomBytes: (byteCount: number) => Promise<Uint8Array>;
}) {
  const operationId = input.randomUuid();
  const bytes = await input.randomBytes(32);
  if (bytes.length !== 32) throw new Error("Account deletion recovery entropy is unavailable");
  return {
    operationId,
    recoverySecret: encodeBase64Url(bytes)
  };
}

function encodeBase64Url(bytes: Uint8Array) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    output += alphabet[first >> 2];
    output += alphabet[((first & 0x03) << 4) | ((second ?? 0) >> 4)];
    if (second !== undefined) output += alphabet[((second & 0x0f) << 2) | ((third ?? 0) >> 6)];
    if (third !== undefined) output += alphabet[third & 0x3f];
  }
  return output;
}
