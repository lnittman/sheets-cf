export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // API Routes
      if (url.pathname === '/api/generate' && request.method === 'POST') {
        return handleGenerate(request, env, corsHeaders);
      }
      
      if (url.pathname === '/api/rules' && request.method === 'GET') {
        return handleGetRules(env, corsHeaders);
      }
      
      if (url.pathname.startsWith('/api/rules/') && request.method === 'GET') {
        const path = url.pathname.replace('/api/rules/', '');
        return handleGetRuleContent(path, env, corsHeaders);
      }
      
      if (url.pathname === '/api/rules' && request.method === 'POST') {
        return handleUploadRules(request, env, corsHeaders);
      }
      
      if (url.pathname.startsWith('/api/rules/') && request.method === 'DELETE') {
        const path = url.pathname.replace('/api/rules/', '');
        return handleDeleteRule(path, env, corsHeaders);
      }
      
      if (url.pathname === '/api/autocomplete' && request.method === 'GET') {
        return handleAutocomplete(url, env, corsHeaders);
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

/**
 * Handles report generation with OpenRouter integration
 */
async function handleGenerate(request, env, corsHeaders) {
  const { prompt } = await request.json();
  
  // Parse URLs and tags from prompt
  const urls = extractUrls(prompt);
  const tags = extractTags(prompt);
  const isGithubUrl = urls.some(url => url.includes('github.com'));
  
  // Build context from tagged files
  let context = '';
  for (const tag of tags) {
    const path = tag.slice(1); // Remove # prefix
    const content = await env.CONTEXT_KV.get(`file:${path}`);
    if (content) {
      context += `\n\n---\nFile: ${path}\n---\n${content}\n`;
    }
  }
  
  // Fetch URL content for analysis
  let urlContent = '';
  for (const url of urls) {
    try {
      if (isGithubUrl && url.includes('github.com')) {
        urlContent += await fetchGithubContent(url);
      } else {
        const response = await fetch(url);
        const text = await response.text();
        urlContent += `\n\n---\nURL: ${url}\n---\n${text.slice(0, 5000)}...\n`;
      }
    } catch (error) {
      urlContent += `\n\n---\nURL: ${url}\n---\nError fetching: ${error.message}\n`;
    }
  }
  
  // Build system prompt for deep analysis
  const systemPrompt = `You are an expert developer analyst. Your task is to perform deep research and analysis on the provided content.

${context ? `Developer Context:\n${context}` : ''}

${urlContent ? `Content to Analyze:\n${urlContent}` : ''}

User Request: ${prompt}

Provide a comprehensive developer report that includes:
1. Deep analysis of the codebase/content structure
2. Key patterns, techniques, and concepts identified
3. Specific suggestions for improvements or applications
4. Code quality assessment and architectural insights
5. Potential security concerns or performance optimizations
6. Recommended tools, libraries, or approaches

Format your response in a clear, structured manner using markdown. Be thorough and technical.`;

  // Stream response from OpenRouter
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  // Start OpenRouter request
  streamFromOpenRouter(systemPrompt, env.OPENROUTER_API_KEY, writer, encoder);
  
  return new Response(stream.readable, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}

/**
 * Stream response from OpenRouter API
 */
async function streamFromOpenRouter(prompt, apiKey, writer, encoder) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://sheets.dev',
        'X-Title': 'Sheets Developer Tool'
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 8000
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              await writer.write(encoder.encode(content));
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  } catch (error) {
    await writer.write(encoder.encode(`\\n\\nError: ${error.message}`));
  } finally {
    await writer.close();
  }
}

/**
 * Fetch GitHub content with special handling
 */
async function fetchGithubContent(githubUrl) {
  try {
    // Convert GitHub URL to raw content URL if needed
    const url = new URL(githubUrl);
    const pathParts = url.pathname.split('/').filter(p => p);
    
    if (pathParts.length >= 2) {
      const [owner, repo, ...rest] = pathParts;
      
      // If it's a file URL, convert to raw
      if (rest[0] === 'blob' && rest.length > 2) {
        const branch = rest[1];
        const filePath = rest.slice(2).join('/');
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
        
        const response = await fetch(rawUrl);
        const content = await response.text();
        return `\\n\\n---\\nGitHub File: ${filePath}\\n---\\n${content}\\n`;
      }
      
      // For repo URLs, fetch README
      const readmeUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`;
      const response = await fetch(readmeUrl);
      
      if (response.ok) {
        const content = await response.text();
        return `\\n\\n---\\nGitHub Repository: ${owner}/${repo}\\n---\\n${content}\\n`;
      }
    }
    
    return `\\n\\n---\\nGitHub URL: ${githubUrl}\\n---\\n[Unable to fetch content]\\n`;
  } catch (error) {
    return `\\n\\n---\\nGitHub URL: ${githubUrl}\\n---\\nError: ${error.message}\\n`;
  }
}

/**
 * List all context files
 */
async function handleGetRules(env, corsHeaders) {
  const list = await env.CONTEXT_KV.list({ prefix: 'file:' });
  const files = list.keys.map(key => ({
    path: key.name.replace('file:', ''),
    size: key.metadata?.size || 0,
    modified: key.metadata?.modified || new Date().toISOString()
  }));
  
  // Build tree structure
  const tree = buildFileTree(files);
  
  return new Response(JSON.stringify(tree), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * Get specific file content
 */
async function handleGetRuleContent(path, env, corsHeaders) {
  const content = await env.CONTEXT_KV.get(`file:${decodeURIComponent(path)}`);
  
  if (!content) {
    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
  
  return new Response(content, {
    headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
  });
}

/**
 * Upload new context file
 */
async function handleUploadRules(request, env, corsHeaders) {
  const formData = await request.formData();
  const file = formData.get('file');
  const path = formData.get('path') || file.name;
  const content = await file.text();
  
  await env.CONTEXT_KV.put(`file:${path}`, content, {
    metadata: {
      size: content.length,
      modified: new Date().toISOString()
    }
  });
  
  return new Response(JSON.stringify({ success: true, path }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * Delete context file
 */
async function handleDeleteRule(path, env, corsHeaders) {
  await env.CONTEXT_KV.delete(`file:${decodeURIComponent(path)}`);
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * Handle autocomplete for file paths
 */
async function handleAutocomplete(url, env, corsHeaders) {
  const query = url.searchParams.get('q') || '';
  const list = await env.CONTEXT_KV.list({ prefix: 'file:' });
  
  const matches = list.keys
    .map(key => key.name.replace('file:', ''))
    .filter(path => path.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 10);
  
  return new Response(JSON.stringify(matches), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Utility functions
function extractUrls(text) {
  const urlRegex = /https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)/g;
  return text.match(urlRegex) || [];
}

function extractTags(text) {
  const tagRegex = /#[\\w\\/\\.\\-]+/g;
  return text.match(tagRegex) || [];
}

function buildFileTree(files) {
  const tree = { name: 'root', type: 'directory', children: [] };
  
  files.forEach(file => {
    const parts = file.path.split('/');
    let current = tree;
    
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        // File
        current.children.push({
          name: part,
          type: 'file',
          path: file.path,
          size: file.size,
          modified: file.modified
        });
      } else {
        // Directory
        let dir = current.children.find(c => c.name === part && c.type === 'directory');
        if (!dir) {
          dir = { name: part, type: 'directory', children: [] };
          current.children.push(dir);
        }
        current = dir;
      }
    });
  });
  
  return tree;
}
