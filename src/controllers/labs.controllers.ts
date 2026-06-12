import type { Request, Response } from 'express';
import * as service from '../services/labs.services.js';
import {
  createLabBody,
  labIdParam,
  updateLabBody,
} from '../validationSchemas/labs.validationSchema.js';

export async function listLabs(req: Request, res: Response): Promise<void> {
  const data = await service.listLabs(req);
  res.status(200).json({ data });
}

export async function createLab(req: Request, res: Response): Promise<void> {
  const body = createLabBody.parse(req.body);
  const data = await service.createLab(req, body);
  res.status(201).json({ data });
}

export async function updateLab(req: Request, res: Response): Promise<void> {
  const { id } = labIdParam.parse(req.params);
  const body = updateLabBody.parse(req.body);
  const data = await service.updateLab(req, id, body);
  res.status(200).json({ data });
}

export async function deleteLab(req: Request, res: Response): Promise<void> {
  const { id } = labIdParam.parse(req.params);
  const data = await service.deleteLab(req, id);
  res.status(200).json({ data });
}
