import {type Request,type Response,type NextFunction } from "express";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}
