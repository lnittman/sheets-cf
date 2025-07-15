// Sheets CF Worker - GitHub-integrated prompt engineering hub
// Using Groq API with kimi-k2 model

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = request.headers.get('Origin');
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // API Routes
      if (path === '/api/generate') {
        return handleGenerate(request, env, corsHeaders);
      } else if (path === '/api/analyze-repo') {
        return handleRepoAnalysis(request, env, corsHeaders);
      } else if (path === '/api/sheets') {
        return handleSheets(request, env, corsHeaders);
      } else if (path === '/api/sheets/save') {
        return handleSaveSheet(request, env, corsHeaders);
      } else if (path.startsWith('/api/sheets/')) {
        return handleGetSheet(request, env, corsHeaders);
      } else if (path === '/api/context') {
        return handleContext(request, env, corsHeaders);
      } else if (path === '/api/context/upload') {
        return handleContextUpload(request, env, corsHeaders);
      } else if (path === '/api/github/auth') {
        return handleGitHubAuth(request, env, corsHeaders);
      } else if (path === '/api/github/callback') {
        return handleGitHubCallback(request, env, corsHeaders);
      } else if (path === '/api/github/user') {
        return handleGitHubUser(request, env, corsHeaders);
      } else if (path === '/api/github/repos') {
        return handleGitHubRepos(request, env, corsHeaders);
      } else if (path === '/api/commands') {
        return handleCommands(request, env, corsHeaders);
      }
      
      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

// Core generation handler using Groq
async function handleGenerate(request, env, corsHeaders) {
  try {
    const { prompt, context = [], mode = 'default' } = await request.json();
    
    // Load context files if specified
    const contextContent = await loadContext(context, env);
    
    // Build system prompt based on mode
    const systemPrompt = buildSystemPrompt(mode, contextContent);
    
    // Stream response from Groq
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'kimi-k2',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 8192,
      }),
    });

    // Return streaming response
    return new Response(groqResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Analyze GitHub repository
async function handleRepoAnalysis(request, env, corsHeaders) {
  try {
    const { repo, analysisType = 'overview', userToken } = await request.json();
    
    // Parse repo URL or owner/repo format
    const { owner, name } = parseGitHubRepo(repo);
    
    // Fetch repo data from GitHub
    const repoData = await fetchGitHubData(owner, name, userToken);
    
    // Build analysis prompt
    const analysisPrompt = buildAnalysisPrompt(repoData, analysisType);
    
    // Get analysis from Groq
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'kimi-k2',
        messages: [
          { 
            role: 'system', 
            content: `You are an expert code analyst creating beautiful, comprehensive markdown sheets for developers. 
                     Focus on actionable insights, patterns, and practical recommendations.
                     Use emojis, clear headings, and excellent formatting.` 
          },
          { role: 'user', content: analysisPrompt }
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 8192,
      }),
    });

    return new Response(groqResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Handle sheets CRUD operations
async function handleSheets(request, env, corsHeaders) {
  if (request.method === 'GET') {
    try {
      // Get user ID from auth
      const userId = await getUserId(request, env);
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Query sheets from D1
      const { results } = await env.SHEETS_DB.prepare(
        'SELECT * FROM sheets WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
      ).bind(userId).all();
      
      return new Response(JSON.stringify({ sheets: results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
  
  return new Response('Method not allowed', { 
    status: 405, 
    headers: corsHeaders 
  });
}

// Save a sheet
async function handleSaveSheet(request, env, corsHeaders) {
  try {
    const userId = await getUserId(request, env);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const sheet = await request.json();
    const sheetId = generateId();
    
    // Save to D1
    await env.SHEETS_DB.prepare(
      `INSERT INTO sheets (id, user_id, title, content, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      sheetId,
      userId,
      sheet.title,
      sheet.content,
      JSON.stringify(sheet.metadata || {})
    ).run();
    
    return new Response(JSON.stringify({ id: sheetId, success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Get a specific sheet
async function handleGetSheet(request, env, corsHeaders) {
  try {
    const sheetId = request.url.split('/').pop();
    
    const { results } = await env.SHEETS_DB.prepare(
      'SELECT * FROM sheets WHERE id = ?'
    ).bind(sheetId).all();
    
    if (results.length === 0) {
      return new Response(JSON.stringify({ error: 'Sheet not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ sheet: results[0] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Context management
async function handleContext(request, env, corsHeaders) {
  if (request.method === 'GET') {
    try {
      const userId = await getUserId(request, env);
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // List user's context files
      const list = await env.CONTEXT_KV.list({ prefix: `context:${userId}:` });
      const files = await Promise.all(
        list.keys.map(async (key) => {
          const metadata = await env.CONTEXT_KV.get(`${key.name}:meta`, { type: 'json' });
          return {
            path: key.name.replace(`context:${userId}:`, ''),
            ...metadata
          };
        })
      );
      
      return new Response(JSON.stringify({ files }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
  
  return new Response('Method not allowed', { 
    status: 405, 
    headers: corsHeaders 
  });
}

// Upload context file
async function handleContextUpload(request, env, corsHeaders) {
  try {
    const userId = await getUserId(request, env);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { path, content, metadata = {} } = await request.json();
    const key = `context:${userId}:${path}`;
    
    // Store content and metadata
    await env.CONTEXT_KV.put(key, content);
    await env.CONTEXT_KV.put(`${key}:meta`, JSON.stringify({
      ...metadata,
      uploadedAt: new Date().toISOString(),
      size: content.length,
    }));
    
    return new Response(JSON.stringify({ success: true, path }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Commands handler
async function handleCommands(request, env, corsHeaders) {
  const commands = [
    {
      id: 'analyze',
      name: 'analyze repository',
      description: 'deep dive into github repositories',
      icon: '🔍',
      modes: ['overview', 'security', 'patterns', 'improvements', 'learning']
    },
    {
      id: 'compare',
      name: 'compare codebases',
      description: 'compare two repositories or branches',
      icon: '🔄',
      modes: ['architecture', 'dependencies', 'patterns', 'performance']
    },
    {
      id: 'extract',
      name: 'extract patterns',
      description: 'extract reusable patterns from code',
      icon: '✨',
      modes: ['components', 'utilities', 'architecture', 'testing']
    },
    {
      id: 'audit',
      name: 'security audit',
      description: 'comprehensive security analysis',
      icon: '🔒',
      modes: ['vulnerabilities', 'dependencies', 'secrets', 'compliance']
    },
    {
      id: 'document',
      name: 'generate docs',
      description: 'create beautiful documentation',
      icon: '📚',
      modes: ['api', 'architecture', 'setup', 'contributing']
    },
    {
      id: 'vision',
      name: 'product vision',
      description: 'reimagine your product with AI',
      icon: '🧘',
      modes: ['features', 'ux', 'architecture', 'philosophy']
    }
  ];
  
  return new Response(JSON.stringify({ commands }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Helper functions
function parseGitHubRepo(input) {
  const match = input.match(/(?:https?:\/\/github\.com\/)?([^\/]+)\/([^\/]+)/);
  if (!match) throw new Error('Invalid repository format');
  return { owner: match[1], name: match[2].replace('.git', '') };
}

async function fetchGitHubData(owner, name, token) {
  const headers = token ? { 'Authorization': `token ${token}` } : {};
  
  // Fetch repo info, README, and file structure in parallel
  const [repoInfo, readme, tree] = await Promise.all([
    fetch(`https://api.github.com/repos/${owner}/${name}`, { headers })
      .then(r => r.json()),
    fetch(`https://api.github.com/repos/${owner}/${name}/readme`, { headers })
      .then(r => r.json())
      .catch(() => null),
    fetch(`https://api.github.com/repos/${owner}/${name}/git/trees/main?recursive=1`, { headers })
      .then(r => r.json())
      .catch(() => null)
  ]);
  
  return { repoInfo, readme, tree };
}

function buildAnalysisPrompt(repoData, analysisType) {
  const { repoInfo, readme, tree } = repoData;
  
  let prompt = `# Repository Analysis: ${repoInfo.full_name}\n\n`;
  prompt += `Description: ${repoInfo.description || 'No description'}\n`;
  prompt += `Language: ${repoInfo.language || 'Unknown'}\n`;
  prompt += `Stars: ${repoInfo.stargazers_count} | Forks: ${repoInfo.forks_count}\n\n`;
  
  if (readme) {
    prompt += `## README Content\n${atob(readme.content).substring(0, 3000)}...\n\n`;
  }
  
  if (tree && tree.tree) {
    prompt += `## File Structure\n`;
    const files = tree.tree.filter(f => f.type === 'blob').slice(0, 50);
    files.forEach(f => prompt += `- ${f.path}\n`);
  }
  
  const analysisPrompts = {
    overview: 'Provide a comprehensive overview including architecture, tech stack, and key features.',
    security: 'Conduct a security audit focusing on vulnerabilities, best practices, and recommendations.',
    patterns: 'Identify design patterns, architectural patterns, and coding best practices used.',
    improvements: 'Suggest specific improvements for code quality, performance, and maintainability.',
    learning: 'Extract key learning points and create a study guide for developers.',
    comparison: 'Compare this repository with modern best practices and suggest modernization strategies.'
  };
  
  prompt += `\n\nAnalysis Type: ${analysisType}\n`;
  prompt += analysisPrompts[analysisType] || analysisPrompts.overview;
  prompt += '\n\nGenerate a beautiful, comprehensive markdown sheet with emojis, clear sections, and actionable insights.';
  
  return prompt;
}

function buildSystemPrompt(mode, contextContent) {
  let systemPrompt = `You are an expert developer creating beautiful markdown sheets for prompt engineering.
Your responses should be comprehensive, well-structured, and immediately useful.
Use emojis, clear headings, code examples, and excellent formatting.

You have access to the following context files:
${contextContent}

Focus on:
- Clear, actionable insights
- Beautiful markdown formatting
- Practical code examples
- Modern best practices
- AI-native development patterns`;

  const modePrompts = {
    vision: 'Channel minimalist philosophy and reimagine products with transformative AI experiences.',
    design: 'Focus on beautiful, functional design systems and component architectures.',
    audit: 'Conduct thorough security and code quality analysis with specific recommendations.',
    create: 'Generate production-ready code with modern patterns and best practices.',
    brand: 'Develop comprehensive brand identity and go-to-market strategies.',
  };
  
  if (modePrompts[mode]) {
    systemPrompt += `\n\nMode: ${mode}\n${modePrompts[mode]}`;
  }
  
  return systemPrompt;
}

async function loadContext(contextPaths, env) {
  const contexts = await Promise.all(
    contextPaths.map(async (path) => {
      const content = await env.CONTEXT_KV.get(`context:${path}`);
      return content ? `\n### ${path}\n${content}\n` : '';
    })
  );
  return contexts.join('');
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

async function getUserId(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;
  
  const token = authHeader.replace('Bearer ', '');
  const user = await env.CONTEXT_KV.get(`auth:${token}`, { type: 'json' });
  return user?.id;
}

// GitHub OAuth handlers
async function handleGitHubAuth(request, env, corsHeaders) {
  const state = generateId();
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${env.APP_URL}/api/github/callback&scope=repo,user&state=${state}`;
  
  // Store state for validation
  await env.CONTEXT_KV.put(`oauth:${state}`, 'pending', { expirationTtl: 600 });
  
  return new Response(JSON.stringify({ authUrl }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleGitHubCallback(request, env, corsHeaders) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  // Validate state
  const storedState = await env.CONTEXT_KV.get(`oauth:${state}`);
  if (!storedState) {
    return Response.redirect(`${env.APP_URL}?error=invalid_state`);
  }
  
  // Exchange code for token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${env.APP_URL}/api/github/callback`,
    }),
  });
  
  const { access_token } = await tokenResponse.json();
  
  // Get user info
  const userResponse = await fetch('https://api.github.com/user', {
    headers: { 'Authorization': `token ${access_token}` },
  });
  const user = await userResponse.json();
  
  // Create session
  const sessionToken = generateId();
  await env.CONTEXT_KV.put(`auth:${sessionToken}`, JSON.stringify({
    id: user.id,
    login: user.login,
    name: user.name,
    avatar: user.avatar_url,
    githubToken: access_token,
  }), { expirationTtl: 86400 * 30 });
  
  // Clean up OAuth state
  await env.CONTEXT_KV.delete(`oauth:${state}`);
  
  return Response.redirect(`${env.APP_URL}?token=${sessionToken}`);
}

async function handleGitHubUser(request, env, corsHeaders) {
  const user = await getUserData(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  return new Response(JSON.stringify({ user }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleGitHubRepos(request, env, corsHeaders) {
  const user = await getUserData(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  const reposResponse = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
    headers: { 'Authorization': `token ${user.githubToken}` },
  });
  const repos = await reposResponse.json();
  
  return new Response(JSON.stringify({ repos }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getUserData(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;
  
  const token = authHeader.replace('Bearer ', '');
  return await env.CONTEXT_KV.get(`auth:${token}`, { type: 'json' });
}