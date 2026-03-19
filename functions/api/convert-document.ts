/**
 * POST /api/convert-document   — upload file → CloudConvert → return { jobId }
 * GET  /api/convert-document?jobId=xxx — poll status → return { status, downloadUrl, filename }
 *
 * Supported conversions (CloudConvert free: 25/day):
 *   DOCX → PDF   |   XLSX → PDF   |   PPTX → PDF
 *   PDF  → DOCX  |   PDF  → XLSX
 *   JPG/PNG → PDF (handled client-side via pdf-lib, this endpoint not used for images)
 */

interface Env {
  CLOUDCONVERT_API_KEY: string;
}

interface CCTask {
  id: string;
  name: string;
  operation: string;
  status: 'waiting' | 'processing' | 'finished' | 'error';
  message?: string;
  result?: {
    form?: { url: string; parameters: Record<string, string> };
    files?: Array<{ url: string; filename: string; size: number }>;
  };
}

interface CCJob {
  id: string;
  status: 'waiting' | 'processing' | 'finished' | 'error';
  tasks: CCTask[];
}

const CC_BASE = 'https://api.cloudconvert.com/v2';

const ALLOWED_CONVERSIONS: Record<string, string[]> = {
  docx: ['pdf'],
  doc:  ['pdf'],
  xlsx: ['pdf'],
  xls:  ['pdf'],
  pptx: ['pdf'],
  ppt:  ['pdf'],
  pdf:  ['docx', 'xlsx'],
};

export async function onRequestPost(
  context: { env: Env; request: Request }
): Promise<Response> {
  const { env, request } = context;

  if (!env.CLOUDCONVERT_API_KEY) {
    return json({ error: 'Conversion service not configured' }, 503);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: 'Invalid form data' }, 400);
  }

  const file = formData.get('file') as File | null;
  const outputFormat = (formData.get('outputFormat') as string | null)?.toLowerCase();

  if (!file || !outputFormat) {
    return json({ error: 'Missing file or outputFormat' }, 400);
  }

  const inputFormat = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_CONVERSIONS[inputFormat]?.includes(outputFormat)) {
    return json({ error: `Conversion ${inputFormat} → ${outputFormat} not supported` }, 400);
  }

  // Max 20 MB guard (free tier is generous but let's be safe)
  if (file.size > 20 * 1024 * 1024) {
    return json({ error: 'File too large — maximum 20 MB' }, 413);
  }

  try {
    // ── Step 1: Create job ───────────────────────────────────────────────────
    const jobRes = await fetch(`${CC_BASE}/jobs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.CLOUDCONVERT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: {
          'upload-file': { operation: 'import/upload' },
          'convert-file': {
            operation: 'convert',
            input: ['upload-file'],
            input_format: inputFormat,
            output_format: outputFormat,
            // PDF→DOCX/XLSX quality options
            ...(inputFormat === 'pdf' && outputFormat === 'docx' ? { pdf_to_word: true } : {}),
          },
          'export-file': {
            operation: 'export/url',
            input: ['convert-file'],
            inline: false,
          },
        },
        tag: 'pakecon-converter',
      }),
    });

    if (!jobRes.ok) {
      const err = await jobRes.text();
      console.error('[Convert] Job creation failed:', err);
      return json({ error: 'Failed to create conversion job' }, 502);
    }

    const jobData = (await jobRes.json()) as { data: CCJob };
    const job = jobData.data;

    // ── Step 2: Upload file ──────────────────────────────────────────────────
    const uploadTask = job.tasks.find(t => t.name === 'upload-file');
    if (!uploadTask?.result?.form) {
      return json({ error: 'No upload form returned by CloudConvert' }, 502);
    }

    const uploadForm = new FormData();
    for (const [k, v] of Object.entries(uploadTask.result.form.parameters)) {
      uploadForm.append(k, v);
    }
    uploadForm.append('file', file, file.name);

    const uploadRes = await fetch(uploadTask.result.form.url, {
      method: 'POST',
      body: uploadForm,
    });

    if (!uploadRes.ok) {
      return json({ error: 'File upload to CloudConvert failed' }, 502);
    }

    return json({ jobId: job.id }, 202);

  } catch (err) {
    console.error('[Convert] Error:', err);
    return json({ error: 'Conversion service error', details: String(err) }, 500);
  }
}

export async function onRequestGet(
  context: { env: Env; request: Request }
): Promise<Response> {
  const { env, request } = context;

  const jobId = new URL(request.url).searchParams.get('jobId');
  if (!jobId) return json({ error: 'Missing jobId' }, 400);

  try {
    const res = await fetch(`${CC_BASE}/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${env.CLOUDCONVERT_API_KEY}` },
    });

    if (!res.ok) return json({ error: 'Failed to check job status' }, 502);

    const data = (await res.json()) as { data: CCJob };
    const job = data.data;

    if (job.status === 'error') {
      const errTask = job.tasks.find(t => t.status === 'error');
      return json({ status: 'error', error: errTask?.message ?? 'Conversion failed' }, 200);
    }

    if (job.status === 'finished') {
      const exportTask = job.tasks.find(t => t.name === 'export-file');
      const file = exportTask?.result?.files?.[0];
      if (!file) return json({ status: 'error', error: 'No output file found' }, 200);
      return json({ status: 'finished', downloadUrl: file.url, filename: file.filename, size: file.size }, 200);
    }

    return json({ status: job.status }, 200);

  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
