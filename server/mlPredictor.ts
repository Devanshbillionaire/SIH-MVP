import fs from 'fs';
import path from 'path';

export interface MLModelMetadata {
  status: 'COLD_START' | 'TRAINED';
  model_version: string;
  training_samples: number;
  last_trained: string | null;
  validation_score: number | null;
  accuracy: number | null;
  min_samples_for_trained: number;
  features_used: string[];
}

export interface TrainingSample {
  task_id?: string;
  timestamp: number;
  x: number[];
  y: number; // 1 for success/selected, 0 for failure/rejected
  outcome?: string;
  candidate_type?: string;
  action_type?: string;
}

const STORAGE_DIR = path.join(process.cwd(), 'storage');
const MODEL_FILE = path.join(STORAGE_DIR, 'ml_model.json');
const MIN_SAMPLES_FOR_TRAINED = 5;

export class AgentMLModel {
  private status: 'COLD_START' | 'TRAINED' = 'COLD_START';
  private modelVersion: string = 'v1.0.0';
  private weights: number[] = [0.30, 0.28, 0.22, 0.10, 0.10];
  private bias: number = -0.15;
  private samples: TrainingSample[] = [];
  private lastTrained: string | null = null;
  private validationScore: number | null = null;
  private accuracy: number | null = null;

  constructor() {
    this.ensureStorage();
    this.loadState();
  }

  private ensureStorage() {
    try {
      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }
    } catch (err) {
      console.error('[MLModel] Storage directory init error:', err);
    }
  }

  private loadState() {
    try {
      if (fs.existsSync(MODEL_FILE)) {
        const raw = fs.readFileSync(MODEL_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (data.samples && Array.isArray(data.samples)) {
          this.samples = data.samples;
        }
        if (data.weights && Array.isArray(data.weights)) {
          this.weights = data.weights;
        }
        if (typeof data.bias === 'number') {
          this.bias = data.bias;
        }
        this.modelVersion = data.modelVersion || 'v1.0.0';
        this.lastTrained = data.lastTrained || null;
        this.validationScore = data.validationScore ?? null;
        this.accuracy = data.accuracy ?? null;

        if (this.samples.length >= MIN_SAMPLES_FOR_TRAINED) {
          this.status = 'TRAINED';
        } else {
          this.status = 'COLD_START';
        }
        return;
      }
    } catch (err) {
      console.warn('[MLModel] Could not load persisted model:', err);
    }

    // If no persisted state, start in COLD_START
    this.status = 'COLD_START';
    this.samples = [];
    this.lastTrained = null;
    this.validationScore = null;
    this.accuracy = null;
  }

  private saveState() {
    try {
      this.ensureStorage();
      const payload = {
        modelVersion: this.modelVersion,
        status: this.status,
        weights: this.weights,
        bias: this.bias,
        samples: this.samples,
        lastTrained: this.lastTrained,
        validationScore: this.validationScore,
        accuracy: this.accuracy
      };
      fs.writeFileSync(MODEL_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.error('[MLModel] Failed to persist model state:', err);
    }
  }

  /**
   * Safe logistic regression prediction.
   * Returns null if model is in COLD_START.
   */
  public predictConfidence(features: number[]): { confidence: number | null; status: 'COLD_START' | 'TRAINED' } {
    if (this.status === 'COLD_START' || this.samples.length < MIN_SAMPLES_FOR_TRAINED) {
      return { confidence: null, status: 'COLD_START' };
    }

    try {
      let z = this.bias;
      for (let i = 0; i < this.weights.length; i++) {
        z += this.weights[i] * (features[i] ?? 0.5);
      }
      // Sigmoid with clamp for numerical stability
      const clampedZ = Math.max(-10, Math.min(10, z));
      const prob = 1 / (1 + Math.exp(-clampedZ));
      const confidence = Math.round(Math.max(0.05, Math.min(0.98, prob)) * 10000) / 10000;
      return { confidence, status: 'TRAINED' };
    } catch {
      return { confidence: null, status: 'COLD_START' };
    }
  }

  /**
   * Records a verified outcome training sample.
   * Ensures STRICT privacy: only numeric vectors, action metadata, no raw sensitive text.
   */
  public recordTrainingExample(example: {
    task_id?: string;
    features: number[];
    label: number; // 1 for success/selected, 0 for failure/rejected
    outcome?: string;
    candidate_type?: string;
    action_type?: string;
  }): { recorded: boolean; total_samples: number; status: 'COLD_START' | 'TRAINED' } {
    if (!example.features || example.features.length === 0) {
      return { recorded: false, total_samples: this.samples.length, status: this.status };
    }

    // Pad or slice to exactly 5 features [visual_conf, dom_conf, text_sim, context_sim, prev_success]
    const cleanFeatures: number[] = [
      Math.max(0, Math.min(1, example.features[0] ?? 0.5)),
      Math.max(0, Math.min(1, example.features[1] ?? 0.5)),
      Math.max(0, Math.min(1, example.features[2] ?? 0.5)),
      Math.max(0, Math.min(1, example.features[3] ?? 0.8)),
      Math.max(0, Math.min(1, example.features[4] ?? 0.85))
    ];

    const sample: TrainingSample = {
      task_id: example.task_id ? String(example.task_id).slice(0, 64) : undefined,
      timestamp: Date.now(),
      x: cleanFeatures,
      y: example.label === 1 ? 1 : 0,
      outcome: example.outcome || (example.label === 1 ? 'VERIFIED_SUCCESS' : 'VERIFIED_FAILURE'),
      candidate_type: example.candidate_type ? String(example.candidate_type).slice(0, 32) : 'element',
      action_type: example.action_type ? String(example.action_type).slice(0, 32) : 'CLICK'
    };

    this.samples.push(sample);

    // If we now have enough samples, trigger safe retraining
    if (this.samples.length >= MIN_SAMPLES_FOR_TRAINED) {
      this.safeRetrain();
    } else {
      this.saveState();
    }

    return {
      recorded: true,
      total_samples: this.samples.length,
      status: this.status
    };
  }

  /**
   * Safe retraining with validation check.
   * If validation fails or error occurs, previous working weights are preserved.
   */
  public safeRetrain(): boolean {
    if (this.samples.length < MIN_SAMPLES_FOR_TRAINED) {
      this.status = 'COLD_START';
      return false;
    }

    // Backup current weights before training
    const backupWeights = [...this.weights];
    const backupBias = this.bias;

    try {
      const lr = 0.08;
      const epochs = 120;
      let newWeights = [...this.weights];
      let newBias = this.bias;

      for (let epoch = 0; epoch < epochs; epoch++) {
        for (const sample of this.samples) {
          let z = newBias;
          for (let i = 0; i < newWeights.length; i++) {
            z += newWeights[i] * sample.x[i];
          }
          const pred = 1 / (1 + Math.exp(-Math.max(-10, Math.min(10, z))));
          const error = sample.y - pred;
          for (let i = 0; i < newWeights.length; i++) {
            newWeights[i] += lr * error * sample.x[i];
          }
          newBias += lr * error;
        }
      }

      // Model Validation: evaluate prediction on sample set
      let correct = 0;
      for (const sample of this.samples) {
        let z = newBias;
        for (let i = 0; i < newWeights.length; i++) {
          z += newWeights[i] * sample.x[i];
        }
        const prob = 1 / (1 + Math.exp(-Math.max(-10, Math.min(10, z))));
        const predictedClass = prob >= 0.5 ? 1 : 0;
        if (predictedClass === sample.y) {
          correct++;
        }
      }

      const valScore = Math.round((correct / this.samples.length) * 1000) / 1000;

      // Validation safeguard: threshold check
      if (valScore < 0.50 && this.samples.length > 8) {
        console.warn(`[MLModel] Retrained model failed validation (${valScore}). Preserving existing model.`);
        this.weights = backupWeights;
        this.bias = backupBias;
        return false;
      }

      // Successfully validated
      this.weights = newWeights;
      this.bias = newBias;
      this.status = 'TRAINED';
      this.lastTrained = new Date().toISOString();
      this.validationScore = valScore;
      this.accuracy = valScore;
      this.saveState();
      return true;
    } catch (err) {
      console.error('[MLModel] Error during retraining. Restoring backup weights:', err);
      this.weights = backupWeights;
      this.bias = backupBias;
      return false;
    }
  }

  /**
   * Seeds the model with verified initial training examples for instant usability when requested.
   */
  public seedInitialTrainingData() {
    const initialSeeds = [
      { x: [0.90, 0.95, 0.92, 0.85, 0.90], y: 1, outcome: 'VERIFIED_SUCCESS', candidate_type: 'input' },
      { x: [0.85, 0.88, 0.90, 0.80, 0.85], y: 1, outcome: 'VERIFIED_SUCCESS', candidate_type: 'button' },
      { x: [0.75, 0.80, 0.78, 0.70, 0.75], y: 1, outcome: 'VERIFIED_SUCCESS', candidate_type: 'input' },
      { x: [0.20, 0.25, 0.15, 0.10, 0.30], y: 0, outcome: 'VERIFIED_FAILURE', candidate_type: 'div' },
      { x: [0.30, 0.40, 0.35, 0.20, 0.40], y: 0, outcome: 'VERIFIED_FAILURE', candidate_type: 'span' },
      { x: [0.95, 0.92, 0.94, 0.90, 0.92], y: 1, outcome: 'VERIFIED_SUCCESS', candidate_type: 'input' },
      { x: [0.15, 0.20, 0.10, 0.05, 0.20], y: 0, outcome: 'VERIFIED_FAILURE', candidate_type: 'p' }
    ];

    this.samples = initialSeeds.map((s, idx) => ({
      task_id: `seed_task_${idx + 1}`,
      timestamp: Date.now() - (idx + 1) * 3600000,
      x: s.x,
      y: s.y,
      outcome: s.outcome,
      candidate_type: s.candidate_type,
      action_type: s.candidate_type === 'button' ? 'CLICK' : 'FILL'
    }));

    this.safeRetrain();
  }

  /**
   * Resets model to initial Cold Start state.
   */
  public resetToColdStart(): MLModelMetadata {
    this.status = 'COLD_START';
    this.weights = [0.30, 0.28, 0.22, 0.10, 0.10];
    this.bias = -0.15;
    this.samples = [];
    this.lastTrained = null;
    this.validationScore = null;
    this.accuracy = null;
    this.saveState();
    return this.getMetadata();
  }

  public getMetadata(): MLModelMetadata {
    return {
      status: this.status,
      model_version: this.modelVersion,
      training_samples: this.samples.length,
      last_trained: this.lastTrained,
      validation_score: this.validationScore,
      accuracy: this.accuracy,
      min_samples_for_trained: MIN_SAMPLES_FOR_TRAINED,
      features_used: [
        'visual_confidence',
        'dom_confidence',
        'text_similarity',
        'context_similarity',
        'historical_success'
      ]
    };
  }

  public getSamples(): TrainingSample[] {
    return [...this.samples];
  }
}

export const mlInstance = new AgentMLModel();

export function predictMLConfidence(
  visualConf: number,
  domConf: number,
  textSim: number,
  contextSim: number = 0.8,
  prevSuccess: number = 0.85
): { confidence: number | null; status: 'COLD_START' | 'TRAINED' } {
  return mlInstance.predictConfidence([visualConf, domConf, textSim, contextSim, prevSuccess]);
}

export function recordMLTrainingExample(example: {
  task_id?: string;
  features: number[];
  label: number;
  outcome?: string;
  candidate_type?: string;
  action_type?: string;
}) {
  return mlInstance.recordTrainingExample(example);
}

export function retrainML(featuresList: number[][], labelsList: number[]) {
  featuresList.forEach((feats, idx) => {
    mlInstance.recordTrainingExample({
      features: feats,
      label: labelsList[idx] ?? 1
    });
  });
}

export function getMLMetadata(): MLModelMetadata {
  return mlInstance.getMetadata();
}
