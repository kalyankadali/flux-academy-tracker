import type { CourseData } from '../../types';
import { FIGMA_FOR_WEB_DESIGNERS_2_0 } from './figma-for-web-designers-2-0';
import { CLIENT_READY_IMAGERY_WITH_MAGNIFIC } from './client-ready-imagery-with-magnific';
import { FRAMER_3_0 } from './framer-3-0';
import { WEBFLOW_AI } from './webflow-ai';
import { AI_WEB_DESIGN_SPRINT } from './ai-web-design-sprint';
import { ECOMMERCE_AI_SPRINT } from './ecommerce-ai-sprint';
import { FREELANCING_FOR_WEB_DESIGNERS } from './freelancing-for-web-designers';
import { WEB_DESIGN_MASTERCLASS } from './web-design-masterclass';
import { WRITESITE_STRATEGIC_COPYWRITING_FOR_WEB_DESIGNERS } from './writesite-strategic-copywriting-for-web-designers';
import { CORE_DESIGN_SKILLS } from './core-design-skills';
import { BRAND_DESIGN_MASTERY } from './brand-design-mastery';
import { WEBFLOW_MASTERCLASS_5_1_PRO_CONTENT } from './webflow-masterclass-5-1-pro-content';
import { WEBFLOW_MASTERCLASS_5_1 } from './webflow-masterclass-5-1';
import { FRAMER_MASTERCLASS_2_0 } from './framer-masterclass-2-0';
import { WEB_DESIGN_BECOMING_A_PROFESSIONAL } from './web-design-becoming-a-professional';

export const COURSES: CourseData[] = [
  FIGMA_FOR_WEB_DESIGNERS_2_0,
  FRAMER_MASTERCLASS_2_0,
  FRAMER_3_0,
  CORE_DESIGN_SKILLS,
  BRAND_DESIGN_MASTERY,
  WRITESITE_STRATEGIC_COPYWRITING_FOR_WEB_DESIGNERS,
  WEB_DESIGN_MASTERCLASS,
  WEB_DESIGN_BECOMING_A_PROFESSIONAL,
  FREELANCING_FOR_WEB_DESIGNERS,
  WEBFLOW_MASTERCLASS_5_1,
  WEBFLOW_MASTERCLASS_5_1_PRO_CONTENT,
  CLIENT_READY_IMAGERY_WITH_MAGNIFIC,
  WEBFLOW_AI,
  AI_WEB_DESIGN_SPRINT,
  ECOMMERCE_AI_SPRINT,
];

export function getCourseById(id: string): CourseData | undefined {
  return COURSES.find((c) => c.id === id);
}

export {
  CLIENT_READY_IMAGERY_WITH_MAGNIFIC,
  FRAMER_3_0,
  WEBFLOW_AI,
  AI_WEB_DESIGN_SPRINT,
  ECOMMERCE_AI_SPRINT,
  FREELANCING_FOR_WEB_DESIGNERS,
  WEB_DESIGN_MASTERCLASS,
  WRITESITE_STRATEGIC_COPYWRITING_FOR_WEB_DESIGNERS,
  CORE_DESIGN_SKILLS,
  BRAND_DESIGN_MASTERY,
  WEBFLOW_MASTERCLASS_5_1_PRO_CONTENT,
  FIGMA_FOR_WEB_DESIGNERS_2_0,
  WEBFLOW_MASTERCLASS_5_1,
  FRAMER_MASTERCLASS_2_0,
  WEB_DESIGN_BECOMING_A_PROFESSIONAL,
};
