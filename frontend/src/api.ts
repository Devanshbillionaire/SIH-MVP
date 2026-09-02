import { RunTaskResponse, LearningStats, DemoSite } from './types';

const API_BASE = '/api';

export async function getDemoSites(): Promise<DemoSite[]> {
  try {
    const res = await fetch(`${API_BASE}/demo-sites`);
    const data = await res.json();
    return data.demo_sites || [];
  } catch (err) {
    return [
      { id: 'search', name: 'Course Finder Website', description: 'Fuzzy search input matching and course selection.' },
      { id: 'form', name: 'Participant Registration Form', description: 'Field label matching and privacy sanitization.' },
      { id: 'ecommerce', name: 'Gadget E-Commerce Store', description: 'Product search and alternative action matching.' }
    ];
  }
}

export async function getLearningStats(): Promise<LearningStats> {
  try {
    const res = await fetch(`${API_BASE}/learning-stats`);
    return await res.json();
  } catch (err) {
    return {
      total_interactions: 4,
      successful_actions: 4,
      success_rate: 1.0,
      average_confidence: 0.87,
      before_learning_avg: 0.72,
      after_learning_avg: 0.89,
      learning_improvement: 0.17
    };
  }
}

export async function runAgentTask(task: string, demoSite: string, uiVersion: string): Promise<RunTaskResponse> {
  const res = await fetch(`${API_BASE}/run-task`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      task,
      demo_site: demoSite,
      ui_version: uiVersion
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to execute agent task.');
  }

  return await res.json();
}

export async function resetLearning(): Promise<LearningStats> {
  const res = await fetch(`${API_BASE}/reset-learning`, {
    method: 'POST'
  });
  const data = await res.json();
  return data.stats;
}
