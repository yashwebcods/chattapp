export const DateFormated = (date) => {
    return new Date(date).toLocaleString('en-US', {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    })
}

/**
 * Transforms a Cloudinary URL to force download by adding the 'fl_attachment' flag.
 * If verified as a Cloudinary URL, it inserts 'fl_attachment' into the upload path.
 */
export const getDownloadUrl = (url) => {
    if (!url) return "";

    // Check if it's a Cloudinary URL
    if (url.includes("cloudinary.com") && url.includes("/upload/")) {
        // Find the index of "/upload/" and insert "fl_attachment/" after it
        // Cloudinary transformation flags are added right after /upload/
        return url.replace("/upload/", "/upload/fl_attachment/");
    }

    return url;
};