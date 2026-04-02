import { db } from '../config/database';

export const jobService = {
  async createJob(jobType: string, assetId?: string, metadata?: unknown) {
    const result = await db.query(
      `INSERT INTO background_jobs (job_type, asset_id, metadata, status) 
       VALUES ($1, $2, $3, 'pending') 
       RETURNING id`,
      [jobType, assetId, metadata]
    );
    return result.rows[0].id;
  },

  async startJob(jobId: string) {
    await db.query(
      `UPDATE background_jobs 
       SET status = 'running', started_at = NOW() 
       WHERE id = $1`,
      [jobId]
    );
  },

  async completeJob(jobId: string, durationMs?: number) {
    await db.query(
      `UPDATE background_jobs 
       SET status = 'completed', completed_at = NOW(), 
       duration_ms = COALESCE($2, EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000)
       WHERE id = $1`,
      [jobId, durationMs]
    );
  },

  async failJob(jobId: string, error: string) {
    await db.query(
      `UPDATE background_jobs 
       SET status = 'failed', completed_at = NOW(), error = $2 
       WHERE id = $1`,
      [jobId, error]
    );
  },

  async addLog(jobId: string, step: string, message: string) {
    await db.query(`INSERT INTO job_logs (job_id, step, message) VALUES ($1, $2, $3)`, [
      jobId,
      step,
      message,
    ]);
  },

  async getJobs(limit = 50, offset = 0, status?: string) {
    let query = `
      SELECT 
        j.id,
        j.job_type,
        j.asset_id,
        a.name as asset_name,
        j.status,
        j.started_at,
        j.completed_at,
        j.duration_ms,
        j.error,
        j.metadata,
        j.created_at,
        COUNT(l.id) as log_count
      FROM background_jobs j
      LEFT JOIN assets a ON j.asset_id = a.id
      LEFT JOIN job_logs l ON j.id = l.job_id
    `;

    const params: unknown[] = [];
    if (status) {
      query += ` WHERE j.status = $1`;
      params.push(status);
    }

    query += ` GROUP BY j.id, a.name ORDER BY j.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  },

  async getJobDetails(jobId: string) {
    const jobResult = await db.query(
      `SELECT j.*, a.name as asset_name 
       FROM background_jobs j
       LEFT JOIN assets a ON j.asset_id = a.id
       WHERE j.id = $1`,
      [jobId]
    );

    const logsResult = await db.query(
      `SELECT * FROM job_logs WHERE job_id = $1 ORDER BY created_at ASC`,
      [jobId]
    );

    return {
      ...jobResult.rows[0],
      logs: logsResult.rows,
    };
  },
};
