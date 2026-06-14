import { Router, type IRouter } from "express";
import healthRouter from "./health";
import formsRouter from "./forms";
import entitiesRouter from "./entities";

const router: IRouter = Router();

router.use(healthRouter);
router.use(formsRouter);
router.use(entitiesRouter);

export default router;
