import { Router } from 'express';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { getWeather } from '../services/weather.js';

export const weatherRouter = Router();
weatherRouter.use(requireAuth);

// Current + hourly + daily for a coordinate (FR-13..16, FR-39..41)
weatherRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) throw new ApiError(400, 'lat and lng required');
    const force = req.query.force === 'true';
    const data = await getWeather(lat, lng, { force });
    res.json(data);
  }),
);
