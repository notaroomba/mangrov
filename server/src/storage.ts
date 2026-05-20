import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000";
const region = process.env.S3_REGION ?? "us-east-1";
const accessKeyId = process.env.S3_ACCESS_KEY ?? "minioadmin";
const secretAccessKey = process.env.S3_SECRET_KEY ?? "minioadmin";
const forcePathStyle = (process.env.S3_FORCE_PATH_STYLE ?? "true") === "true";

export const bucket = process.env.S3_BUCKET ?? "mangrov-images";
export const publicUrl =
  process.env.S3_PUBLIC_URL ?? `${endpoint.replace(/\/+$/, "")}/${bucket}`;

export const s3 = new S3Client({
  region,
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle,
});

export type UploadKind = "post" | "trade" | "message" | "avatar";

export function buildKey(kind: UploadKind, userId: string, contentType: string) {
  const ext = contentType.split("/")[1]?.split("+")[0] || "bin";
  return `${kind}/${userId}/${Date.now()}-${randomUUID()}.${ext}`;
}

export async function presignPut(opts: {
  key: string;
  contentType: string;
  expiresIn?: number;
}) {
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: opts.key,
    ContentType: opts.contentType,
  });
  return getSignedUrl(s3, cmd, { expiresIn: opts.expiresIn ?? 300 });
}

export function publicUrlFor(key: string) {
  return `${publicUrl.replace(/\/+$/, "")}/${key}`;
}
