// Google Cloud Storage helper for trace file uploads
//
// Uses the GCS REST API with Cloud Run's default credentials.
// Uploads are placed in the bucket specified by PRIVATE_BUCKET_NAME env var.

interface UploadOptions {
  contentType?: string;
}

/**
 * Get an access token from the Cloud Run metadata server.
 */
async function getAccessToken(): Promise<string> {
  const metadataUrl =
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";

  const response = await fetch(metadataUrl, {
    headers: { "Metadata-Flavor": "Google" },
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Upload a file to GCS.
 * Returns the gs:// URI of the uploaded file.
 */
export async function uploadToGcs(
  localPath: string,
  remotePath: string,
  options: UploadOptions = {},
): Promise<string> {
  const bucket = Deno.env.get("PRIVATE_BUCKET_NAME");
  if (!bucket) {
    throw new Error("PRIVATE_BUCKET_NAME environment variable not set");
  }

  const { contentType = "application/octet-stream" } = options;

  // Read the file
  const fileContent = await Deno.readFile(localPath);

  // Get access token
  const token = await getAccessToken();

  // Upload via GCS JSON API
  const uploadUrl =
    `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${
      encodeURIComponent(remotePath)
    }`;

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": contentType,
    },
    body: fileContent,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload to GCS: ${response.status} - ${error}`);
  }

  return `gs://${bucket}/${remotePath}`;
}

/**
 * Upload a file to GCS, then delete the local file.
 * Returns the gs:// URI of the uploaded file.
 */
export async function uploadAndCleanup(
  localPath: string,
  remotePath: string,
  options: UploadOptions = {},
): Promise<string> {
  const gcsUri = await uploadToGcs(localPath, remotePath, options);

  // Clean up local file
  try {
    await Deno.remove(localPath);
  } catch {
    // Ignore cleanup errors
  }

  return gcsUri;
}

/**
 * Check if GCS storage is configured.
 */
export function isStorageConfigured(): boolean {
  return !!Deno.env.get("PRIVATE_BUCKET_NAME");
}
