const fileTypeMap = {
    docs: ['.pdf', '.docx', '.txt', '.md'],
    images: ['.jpg', '.jpeg', '.png', '.gif'],
    videos: ['.mp4', '.mov', '.avi'],
    others: []
};
  
function getFileCategory(filename) {
    const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    for (const [type, extensions] of Object.entries(fileTypeMap)) {
        if (extensions.includes(ext)) return type;
    }
    return 'others';
}
  