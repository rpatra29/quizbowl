const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
loadEnv(path.join(root, '.env'));

const port = Number(process.env.PORT) || 8000;
const groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
const groqEndpoint = 'https://api.groq.com/openai/v1/chat/completions';

const questionSetSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'questions'],
  properties: {
    title: { type: 'string' },
    questions: {
      type: 'array',
      minItems: 1,
      maxItems: 30,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['answer', 'label', 'clue', 'category'],
        properties: {
          answer: { type: 'string' },
          label: { type: 'string' },
          clue: { type: 'string' },
          category: { type: 'string' }
        }
      }
    }
  }
};

function loadEnv(filename) {
  if (!fs.existsSync(filename)) return;
  for (const rawLine of fs.readFileSync(filename, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 1_000_000) request.destroy(new Error('Request body is too large.'));
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(new Error('Request body must be valid JSON.'));
      }
    });
    request.on('error', reject);
  });
}

async function generateQuestions(request, response) {
  if (!process.env.GROQ_API_KEY) {
    sendJson(response, 503, { error: 'The server is missing GROQ_API_KEY.' });
    return;
  }

  try {
    const body = await readJson(request);
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) {
      sendJson(response, 400, { error: 'A generation prompt is required.' });
      return;
    }

    const upstream = await fetch(groqEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [
          {
            role: 'system',
            content: 'You create accurate, classroom-appropriate quiz bowl sets for teachers. Each question must have a concise answer and a pyramidal clue: begin with harder specific information and become progressively easier. Write 4 to 6 complete sentences per clue. Avoid trick questions, ambiguity, duplicate answers, and unsupported claims. Match the requested grade level and teacher constraints. Return only the requested structured data.'
          },
          { role: 'user', content: prompt }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'thinkfast_question_set',
            strict: true,
            schema: questionSetSchema
          }
        }
      })
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error('Groq API error:', upstream.status, data.error?.message || 'Unknown error');
      sendJson(response, upstream.status, { error: data.error?.message || `Groq request failed (${upstream.status}).` });
      return;
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Groq returned no question-set content.');
    sendJson(response, 200, JSON.parse(content));
  } catch (error) {
    console.error('Question generation failed:', error.message);
    if (!response.headersSent) sendJson(response, 500, { error: error.message || 'Question generation failed.' });
  }
}

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function serveStatic(request, response) {
  const requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
  const filename = path.resolve(root, relativePath);
  if (!filename.startsWith(root + path.sep) || path.basename(filename).startsWith('.')) {
    response.writeHead(404).end('Not found');
    return;
  }
  fs.readFile(filename, (error, data) => {
    if (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500).end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }
    response.writeHead(200, { 'Content-Type': contentTypes[path.extname(filename)] || 'application/octet-stream' });
    response.end(data);
  });
}

const server = http.createServer((request, response) => {
  if (request.method === 'POST' && request.url === '/api/generate') {
    generateQuestions(request, response);
    return;
  }
  if (request.method === 'GET' || request.method === 'HEAD') {
    serveStatic(request, response);
    return;
  }
  response.writeHead(405, { Allow: 'GET, HEAD, POST' }).end('Method not allowed');
});

server.listen(port, () => {
  console.log(`ThinkFast is running at http://localhost:${port}`);
});
