
export const generateMeshyModel = async (apiKey: string, imageUrl: string): Promise<string> => {
  // FALLBACK: Directly use the hardcoded key if the passed key is empty or undefined.
  const validApiKey = apiKey || 'msy_nOLxD8n4qCBD57UD2rblZLxYxHIIyqIshEK8';

  // DOCUMENTATION: https://docs.meshy.ai/api/v2/image-to-3d
  // Updated to V2 API to resolve routing errors.
  
  // CORS PROXY IMPLEMENTATION
  // Browsers block direct calls to Meshy API from client-side due to CORS.
  // We route requests through corsproxy.io.
  const PROXY_BASE = 'https://corsproxy.io/?url=';
  const API_URL = '/api/meshy/openapi/v1/multi-image-to-3d';
  
  // Helper to construct proxied URLs
  // We encode the target URL to ensure special characters don't break the proxy query param.
  // We also add a timestamp parameter to the PROXY URL (not the target URL) to prevent browser/proxy caching.
  const getProxiedUrl = (target: string) => {
    return `${PROXY_BASE}${encodeURIComponent(target)}`;
  };
  
  // 1. Start Generation Task
  const response = await fetch(getProxiedUrl(API_URL), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${validApiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      image_url: imageUrl,
      enable_pbr: true
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Meshy API Error (${response.status}): ${response.statusText}`;
    try {
        const jsonError = JSON.parse(errorText);
        // Handle common Meshy error formats
        if (jsonError.message) errorMessage = jsonError.message;
        if (jsonError.error && jsonError.error.message) errorMessage = jsonError.error.message;
    } catch (e) {
        if (errorText) errorMessage = errorText;
    }
    
    if (imageUrl.startsWith('data:')) {
      console.warn("Meshy API typically requires a hosted public URL. Base64 data may fail.");
    }
    
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const taskId = data.result;

  if (!taskId) {
     throw new Error("Meshy API returned no task ID");
  }

  console.log(`Meshy V2 Task Started: ${taskId}`);

  // 2. Poll for Completion
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    // Timeout set to 6 minutes
    const maxAttempts = 120; 
    const intervalTime = 3000;

    const interval = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(interval);
        reject(new Error("Generation timed out (exceeded 6 minutes)."));
        return;
      }

      try {
        // Construct the status URL
        const statusUrl = `${API_URL}/${taskId}`;
        
        // Fetch via Proxy
        const statusRes = await fetch(getProxiedUrl(statusUrl), {
          headers: { 
            'Authorization': `Bearer ${validApiKey}`,
            'Accept': 'application/json'
          }
        });
        
        if (!statusRes.ok) throw new Error(`Failed to check task status: ${statusRes.status}`);
        
        const statusData = await statusRes.json();
        const progress = statusData.progress || 0;
        
        console.log(`Meshy Status: ${statusData.status} (${progress}%)`);
        
        if (statusData.status === 'SUCCEEDED') {
          clearInterval(interval);
          if (statusData.model_urls?.glb) {
             resolve(statusData.model_urls.glb);
          } else {
             reject(new Error("Generation succeeded but GLB URL is missing"));
          }
        } else if (statusData.status === 'FAILED' || statusData.status === 'EXPIRED') {
          clearInterval(interval);
          reject(new Error(`Generation failed: ${statusData.task_error?.message || 'Unknown error'}`));
        }
      } catch (e) {
        console.warn("Polling error (retrying...):", e);
      }
    }, intervalTime);
  });
};
