
export const generateMeshyModel = async (apiKey: string, imageUrl: string): Promise<string> => {
  // FALLBACK: Directly use the hardcoded key if the passed key is empty or undefined.
  const validApiKey = apiKey || 'msy_nOLxD8n4qCBD57UD2rblZLxYxHIIyqIshEK8';
  
  // DOCUMENTATION: https://docs.meshy.ai/api/v2/image-to-3d
  // Updated to V2 API to resolve routing errors.

  // CORS PROXY IMPLEMENTATION
  const API_URL = '/api/meshy/openapi/v1/image-to-3d';

  // Helper to construct proxied URLs
  const getProxiedUrl = (target: string) => {
    return `${target}`;
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
      enable_pbr: true,
      // ai_model: "meshy-4"
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
    } catch {
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
  return pollMeshyTask(validApiKey, API_URL, taskId);
};

export const generateMultiImageMeshyModel = async (apiKey: string, imageUrls: string[]): Promise<string> => {
  // FALLBACK: Directly use the hardcoded key if the passed key is empty or undefined.
  const validApiKey = apiKey || 'msy_nOLxD8n4qCBD57UD2rblZLxYxHIIyqIshEK8';

  // DOCUMENTATION: https://docs.meshy.ai/en/api/image-to-3d#create-a-multi-image-to-3d-task
  const API_URL = '/api/meshy/openapi/v1/multi-image-to-3d';

  // Helper to construct proxied URLs
  const getProxiedUrl = (target: string) => {
    return `${target}`;
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
      image_urls: imageUrls,
      enable_pbr: true,
      should_remesh: true,
      should_texture: true
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Meshy Multi-Image API Error (${response.status}): ${response.statusText}`;
    try {
      const jsonError = JSON.parse(errorText);
      // Handle common Meshy error formats
      if (jsonError.message) errorMessage = jsonError.message;
      if (jsonError.error && jsonError.error.message) errorMessage = jsonError.error.message;
    } catch {
      if (errorText) errorMessage = errorText;
    }

    throw new Error(errorMessage);
  }

  const data = await response.json();
  const taskId = data.result;

  if (!taskId) {
    throw new Error("Meshy API returned no task ID");
  }

  console.log(`Meshy Multi-Image Task Started: ${taskId}`);

  // 2. Poll for Completion
  return pollMeshyTask(validApiKey, API_URL, taskId);
};

const pollMeshyTask = (apiKey: string, apiUrl: string, taskId: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    // Timeout set to 10 minutes for multi-image which might take longer
    const maxAttempts = 600; 
    const intervalTime = 3000;

    const interval = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(interval);
        reject(new Error("Generation timed out (exceeded 10 minutes)."));
        return;
      }

      try {
        // Construct the status URL
        const statusUrl = `${apiUrl}/${taskId}`;
        const getProxiedUrl = (target: string) => target;

        // Fetch via Proxy
        const statusRes = await fetch(getProxiedUrl(statusUrl), {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
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
            const proxiedGlbUrl = statusData.model_urls.glb.replace('https://assets.meshy.ai', '/api/assets');
            resolve(proxiedGlbUrl);
          } else {
            reject(new Error("Generation succeeded but GLB URL is missing"));
          }
        } else if (statusData.status === 'FAILED' || statusData.status === 'EXPIRED') {
          clearInterval(interval);
          reject(new Error(`Generation failed: ${statusData.task_error?.message || 'Unknown error'}`));
        }
      } catch {
        // console.warn("Polling error (retrying...):", e);
      }
    }, intervalTime);
  });
};
