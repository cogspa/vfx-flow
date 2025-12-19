export async function getVideoMeta(file: File): Promise<{ durationSec?: number; width?: number; height?: number }> {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement("video");
        video.preload = "metadata";
        video.src = url;

        video.onloadedmetadata = () => {
            resolve({
                durationSec: isFinite(video.duration) ? video.duration : undefined,
                width: video.videoWidth || undefined,
                height: video.videoHeight || undefined,
            });
            URL.revokeObjectURL(url);
        };

        video.onerror = () => {
            resolve({});
            URL.revokeObjectURL(url);
        };
    });
}
