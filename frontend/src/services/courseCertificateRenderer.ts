export interface CourseCertificateRenderData {
  studentName: string;
  courseTitle: string;
  courseHours: number;
}

export const COURSE_CERTIFICATE_WIDTH = 3300;
export const COURSE_CERTIFICATE_HEIGHT = 2550;
export const COURSE_CERTIFICATE_PDF_SIZE_MM = [279.4, 215.9] as const;

const SOURCE_WIDTH = 10_058_400;
const SOURCE_HEIGHT = 7_772_400;
const ASSET_BASE_URL = '/assets/course-certificate-v2';
const BIORHYME_FAMILY = 'Innovera BioRhyme';

const assetNames = Array.from({ length: 9 }, (_, index) => `image${index + 1}.png`);
let imagePromise: Promise<HTMLImageElement[]> | null = null;
let fontPromise: Promise<void> | null = null;

const cleanCertificateText = (value: string, fallback: string) => {
  const cleaned = value
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}-\u{2454}\u{20D0}-\u{20FF}]/gu, '')
    .replace(/[★☆]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || fallback;
};

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error(`Failed to load certificate asset: ${src}`));
  image.src = src;
});

const loadTemplateImages = () => {
  if (!imagePromise) {
    imagePromise = Promise.all(assetNames.map((name) => loadImage(`${ASSET_BASE_URL}/${name}`)));
  }
  return imagePromise;
};

const loadBioRhyme = async () => {
  if (!fontPromise) {
    fontPromise = (async () => {
      if (typeof FontFace === 'undefined' || !document.fonts) return;
      const font = new FontFace(
        BIORHYME_FAMILY,
        `url(${ASSET_BASE_URL}/BioRhyme-Variable.ttf) format("truetype")`,
        { style: 'normal', weight: '200 800' },
      );
      const loadedFont = await font.load();
      document.fonts.add(loadedFont);
      await document.fonts.ready;
    })().catch((error) => {
      fontPromise = null;
      throw error;
    });
  }
  return fontPromise;
};

const toX = (value: number, width: number) => value * width / SOURCE_WIDTH;
const toY = (value: number, height: number) => value * height / SOURCE_HEIGHT;
const pointsToPixels = (points: number, height: number) => points * height / 612;

interface TextBoxOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fontWeight?: number;
  color: string;
  align?: CanvasTextAlign;
}

const setCanvasFont = (
  ctx: CanvasRenderingContext2D,
  fontSize: number,
  fontFamily: string,
  fontWeight = 400,
) => {
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
};

const drawTextBox = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  text: string,
  options: TextBoxOptions,
) => {
  const x = toX(options.x, canvas.width);
  const y = toY(options.y, canvas.height);
  const width = toX(options.width, canvas.width);
  const height = toY(options.height, canvas.height);
  const fontSize = pointsToPixels(options.fontSize, canvas.height);

  ctx.save();
  setCanvasFont(ctx, fontSize, options.fontFamily, options.fontWeight);
  ctx.fillStyle = options.color;
  ctx.textAlign = options.align ?? 'left';
  ctx.textBaseline = 'middle';
  const textX = options.align === 'right' ? x + width : options.align === 'center' ? x + width / 2 : x;
  ctx.fillText(text, textX, y + height / 2, width);
  ctx.restore();
};

interface ImagePlacement {
  x: number;
  y: number;
  width: number;
  height: number;
}

const imagePlacements: ImagePlacement[] = [
  { x: 1_247_775, y: 704_850, width: 7_565_827, height: 7_066_955 },
  { x: 7_772_400, y: 0, width: 2_286_000, height: 4_505_325 },
  { x: 0, y: 3_333_673, width: 2_214_563, height: 4_438_727 },
  { x: 381_000, y: 381_000, width: 1_695_450, height: 609_600 },
  { x: 8_991_600, y: 381_000, width: 685_800, height: 685_800 },
  { x: 381_000, y: 3_200_400, width: 7_077_075, height: 1_638_300 },
  { x: 381_000, y: 6_781_800, width: 3_105_150, height: 609_600 },
  { x: 7_848_600, y: 5_904_837, width: 1_828_800, height: 1_657_969 },
  { x: 381_000, y: 1_371_600, width: 5_086_350, height: 1_447_800 },
];

const drawImagePlacement = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  placement: ImagePlacement,
) => {
  ctx.drawImage(
    image,
    toX(placement.x, canvas.width),
    toY(placement.y, canvas.height),
    toX(placement.width, canvas.width),
    toY(placement.height, canvas.height),
  );
};

const fitFontSize = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  initialSize: number,
  minimumSize: number,
  family: string,
  weight = 400,
) => {
  let size = initialSize;
  while (size > minimumSize) {
    setCanvasFont(ctx, size, family, weight);
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  return size;
};

const getCourseLabel = (courseTitle: string) => {
  const title = cleanCertificateText(courseTitle, 'Course');
  return /\b(course|program|certificate)\b/i.test(title) ? title : `${title} course`;
};

const drawDynamicName = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  studentName: string,
) => {
  const x = toX(381_000, canvas.width);
  const y = toY(3_543_300, canvas.height);
  const width = toX(7_248_525, canvas.width);
  const height = toY(628_650, canvas.height);
  const initialSize = pointsToPixels(36, canvas.height);
  const minimumSize = pointsToPixels(22, canvas.height);
  const name = cleanCertificateText(studentName, 'Student Name');
  const size = fitFontSize(ctx, name, width, initialSize, minimumSize, `"${BIORHYME_FAMILY}", Georgia, serif`);

  ctx.save();
  setCanvasFont(ctx, size, `"${BIORHYME_FAMILY}", Georgia, serif`);
  ctx.fillStyle = '#003F84';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, x, y + height / 2, width);
  ctx.restore();
};

const drawDescriptionLine = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  normalText: string,
  highlightedText: string,
  fontSize: number,
) => {
  const normalFamily = 'Calibri, Carlito, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#12263B';
  setCanvasFont(ctx, fontSize, normalFamily);
  ctx.fillText(normalText, x, y);
  const highlightX = x + ctx.measureText(normalText).width;
  ctx.fillStyle = '#11B6C5';
  setCanvasFont(ctx, fontSize, normalFamily, 700);
  ctx.fillText(highlightedText, highlightX, y);
};

const drawDynamicDescription = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  courseTitle: string,
  courseHours: number,
) => {
  const x = toX(381_000, canvas.width);
  const y = toY(4_229_100, canvas.height);
  const width = toX(7_360_158, canvas.width);
  const height = toY(609_600, canvas.height);
  const courseLabel = getCourseLabel(courseTitle);
  const normalText = `For successfully completing the ${courseLabel} with a total duration of `;
  const highlightedText = `${Math.max(1, Math.round(courseHours))} training hours`;
  const family = 'Calibri, Carlito, Arial, sans-serif';
  const initialSize = pointsToPixels(18, canvas.height);
  const minimumSize = pointsToPixels(13, canvas.height);

  let fontSize = initialSize;
  while (fontSize > minimumSize) {
    setCanvasFont(ctx, fontSize, family);
    const normalWidth = ctx.measureText(normalText).width;
    setCanvasFont(ctx, fontSize, family, 700);
    if (normalWidth + ctx.measureText(highlightedText).width <= width) break;
    fontSize -= 1;
  }

  setCanvasFont(ctx, fontSize, family);
  const normalWidth = ctx.measureText(normalText).width;
  setCanvasFont(ctx, fontSize, family, 700);
  const fitsOneLine = normalWidth + ctx.measureText(highlightedText).width <= width;

  ctx.save();
  if (fitsOneLine) {
    drawDescriptionLine(ctx, x, y + height / 2, normalText, highlightedText, fontSize);
  } else {
    const firstLine = `For successfully completing the ${courseLabel}`;
    const secondLine = 'with a total duration of ';
    const lineGap = fontSize * 1.12;
    drawDescriptionLine(ctx, x, y + height / 2 - lineGap / 2, firstLine, '', fontSize);
    drawDescriptionLine(ctx, x, y + height / 2 + lineGap / 2, secondLine, highlightedText, fontSize);
  }
  ctx.restore();
};

/** Draws the approved Course Students template using the original PPTX geometry. */
export const renderCourseCertificateCanvas = async (
  data: CourseCertificateRenderData,
  targetWidth = COURSE_CERTIFICATE_WIDTH,
) => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(targetWidth);
  canvas.height = Math.round(targetWidth * SOURCE_HEIGHT / SOURCE_WIDTH);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context is unavailable for the course certificate.');

  const [images] = await Promise.all([loadTemplateImages(), loadBioRhyme()]);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Keep the same z-order used by the supplied PowerPoint template.
  drawImagePlacement(ctx, canvas, images[0], imagePlacements[0]);
  drawImagePlacement(ctx, canvas, images[1], imagePlacements[1]);
  drawImagePlacement(ctx, canvas, images[2], imagePlacements[2]);
  drawImagePlacement(ctx, canvas, images[3], imagePlacements[3]);
  drawTextBox(ctx, canvas, 'ACADEMY', {
    x: 320_040, y: 762_000, width: 1_756_410, height: 266_700,
    fontSize: 12, fontFamily: 'Calibri, Carlito, Arial, sans-serif', fontWeight: 700,
    color: '#11B6C5', align: 'right',
  });
  drawImagePlacement(ctx, canvas, images[4], imagePlacements[4]);
  drawTextBox(ctx, canvas, 'This is presented to:', {
    x: 381_000, y: 3_200_400, width: 7_218_617, height: 361_950,
    fontSize: 18, fontFamily: 'Calibri, Carlito, Arial, sans-serif', color: '#12263B',
  });
  drawDynamicName(ctx, canvas, data.studentName);
  drawDynamicDescription(ctx, canvas, data.courseTitle, data.courseHours);
  drawImagePlacement(ctx, canvas, images[5], imagePlacements[5]);
  drawImagePlacement(ctx, canvas, images[6], imagePlacements[6]);
  drawImagePlacement(ctx, canvas, images[7], imagePlacements[7]);
  drawTextBox(ctx, canvas, 'MAHA ElSHIBINY', {
    x: 381_000, y: 6_781_800, width: 3_227_070, height: 457_200,
    fontSize: 24, fontFamily: `"${BIORHYME_FAMILY}", Georgia, serif`, fontWeight: 700,
    color: '#003F84',
  });
  drawTextBox(ctx, canvas, 'Head of Innovera Academy', {
    x: 381_000, y: 7_162_800, width: 3_167_253, height: 266_700,
    fontSize: 12, fontFamily: 'Calibri, Carlito, Arial, sans-serif', fontWeight: 700,
    color: '#12263B',
  });
  drawTextBox(ctx, canvas, 'Certificate', {
    x: 381_000, y: 1_371_600, width: 5_257_800, height: 1_085_850,
    fontSize: 72, fontFamily: `"${BIORHYME_FAMILY}", Georgia, serif`, color: '#003F84',
  });
  drawTextBox(ctx, canvas, 'of Completion', {
    x: 381_000, y: 2_362_200, width: 5_208_270, height: 533_400,
    fontSize: 24, fontFamily: 'Calibri, Carlito, Arial, sans-serif', color: '#12263B',
  });
  drawImagePlacement(ctx, canvas, images[8], imagePlacements[8]);

  return canvas;
};
