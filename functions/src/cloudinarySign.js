const crypto = require("crypto");

/**
 * Cloudinary signed upload signature.
 * @see https://cloudinary.com/documentation/upload_images#generating_authentication_signatures
 */
function signCloudinaryParams(params, apiSecret) {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return crypto.createHash("sha1").update(toSign + apiSecret).digest("hex");
}

module.exports = { signCloudinaryParams };
