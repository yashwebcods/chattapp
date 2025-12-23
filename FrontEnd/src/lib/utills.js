export const DateFormated = (date) => {
    return new Date(date).toLocaleString('en-US', {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    })
}

/**
 * Transforms a Cloudinary URL to force download.
 * - For images/videos: Injects 'fl_attachment' flag.
 * - For raw files: Ensures 'response-content-disposition=attachment' query param is present.
 */
export const getDownloadUrl = (url) => {
    if (!url) return "";

    // Check if it's a Cloudinary URL
    if (url.includes("cloudinary.com")) {
        // FOR IMAGES/VIDEOS (stored in /image/upload or /video/upload)
        if (url.includes("/image/upload/") || url.includes("/video/upload/")) {
            if (!url.includes("fl_attachment")) {
                return url.replace("/upload/", "/upload/fl_attachment/");
            }
            return url;
        }

        // FOR RAW FILES (stored in /raw/upload/)
        if (url.includes("/raw/upload/")) {
            if (!url.includes("response-content-disposition=attachment")) {
                const separator = url.includes("?") ? "&" : "?";
                return `${url}${separator}response-content-disposition=attachment`;
            }
            return url;
        }
    }

    return url;
};