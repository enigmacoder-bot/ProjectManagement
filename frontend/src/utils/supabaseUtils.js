// Helper function to get the correct Supabase URL
export const getSupabaseStorageUrl = () => {
  // Default to the known working URL
  return 'https://jswiqxlveqcgrdnohbcn.supabase.co/storage/v1/object/public/';
};

// Helper to construct full document URL
export const getDocumentUrl = (fileUrl, options = {}) => {
  if (!fileUrl) return null;
  
  const supabaseStorageUrl = getSupabaseStorageUrl();
  
  // Check if fileUrl already contains the full URL or just the path
  let fullUrl;
  if (fileUrl.startsWith('http')) {
    // Replace any incorrect Supabase URL with the correct one
    if (fileUrl.includes('inxubyxtqnbfpmxvigre.supabase.co')) {
      fullUrl = fileUrl.replace('inxubyxtqnbfpmxvigre.supabase.co', 'jswiqxlveqcgrdnohbcn.supabase.co');
    } else {
      fullUrl = fileUrl;
    }
  } else {
    // Handle if file_url includes or doesn't include 'project-documents'
    const path = fileUrl.includes('project-documents') 
      ? fileUrl 
      : `project-documents/${fileUrl}`;
    fullUrl = `${supabaseStorageUrl}${path}`;
  }
  
  return fullUrl;
};

// Specific function for getting a viewable URL (especially for PDFs)
export const getViewableDocumentUrl = (fileUrl) => {
  const baseUrl = getDocumentUrl(fileUrl);
  if (!baseUrl) return null;
  
  // For PDFs, use a fragment identifier approach which works better than query parameters
  if (fileUrl.toLowerCase().endsWith('.pdf')) {
    return `${baseUrl}#view=FitH`;
  }
  
  return baseUrl;
};

// Specific function for getting a downloadable URL
export const getDownloadableDocumentUrl = (fileUrl) => {
  const baseUrl = getDocumentUrl(fileUrl);
  if (!baseUrl) return null;
  
  return baseUrl;
};
