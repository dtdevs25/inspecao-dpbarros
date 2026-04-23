import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

const mmToPt = (mm: number) => mm * 2.83465;

export class DailyChecklistService {
    private static ASSETS_PATH = path.join(process.cwd(), 'server', 'assets', 'reports');

    private static async getLocalImageBuffer(filename: string): Promise<Buffer | null> {
        try {
            const possiblePaths = [
                path.join(this.ASSETS_PATH, filename),
                path.join(process.cwd(), 'DPBARROS', 'logos', filename) // fallback to source
            ];
            for (const p of possiblePaths) {
                try {
                    return await fs.readFile(p);
                } catch (e) { }
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    private static drawLine(page: PDFPage, x1: number, y1: number, x2: number, y2: number, color = rgb(0, 0, 0), thickness = 1) {
        page.drawLine({
            start: { x: x1, y: y1 },
            end: { x: x2, y: y2 },
            thickness,
            color
        });
    }

    public static async generateTestCover(): Promise<Buffer> {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([mmToPt(210), mmToPt(297)]); // A4 portrait
        
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
        
        // Colors
        const black = rgb(0, 0, 0);
        const darkGray = rgb(0.2, 0.2, 0.2);
        
        // Header Setup
        const marginX = mmToPt(15);
        let currentY = mmToPt(297) - mmToPt(20);

        // 1. Logo
        const logoBuf = await this.getLocalImageBuffer('sesmt.png');
        if (logoBuf) {
            try {
                const logo = await pdfDoc.embedPng(logoBuf);
                const logoDims = logo.scale(0.3); // adjust scale as needed
                page.drawImage(logo, {
                    x: marginX,
                    y: currentY - mmToPt(15),
                    width: mmToPt(40), // fixed width approx
                    height: mmToPt(15) // fixed height approx
                });
            } catch (e) {
                console.error("Error embedding logo", e);
            }
        }

        // 2. Header Texts
        page.drawText('VISITA TÉCNICA', { x: mmToPt(80), y: currentY, size: 14, font: fontBold, color: black });
        page.drawText('Relatório Fotográfico', { x: mmToPt(80), y: currentY - mmToPt(6), size: 12, font: fontRegular, color: black });
        
        // Pagination
        page.drawText('Página 1 de XX', { x: mmToPt(160), y: currentY - mmToPt(3), size: 10, font: fontRegular, color: black });

        currentY -= mmToPt(25);

        // Draw a table for metadata
        // Horizontal lines
        const tableW = mmToPt(180);
        this.drawLine(page, marginX, currentY, marginX + tableW, currentY);
        
        // Headers: Data de Emissão | Responsável | Revisão
        const col1X = marginX + mmToPt(2);
        const col2X = marginX + mmToPt(60);
        const col3X = marginX + mmToPt(140);

        page.drawText('Data de Emissão', { x: col1X, y: currentY - mmToPt(5), size: 9, font: fontBold });
        page.drawText('Responsável', { x: col2X, y: currentY - mmToPt(5), size: 9, font: fontBold });
        page.drawText('Revisão', { x: col3X, y: currentY - mmToPt(5), size: 9, font: fontBold });

        currentY -= mmToPt(10);
        // Values
        const todayStr = new Date().toLocaleDateString('pt-BR');
        page.drawText(todayStr, { x: col1X, y: currentY, size: 9, font: fontRegular });
        page.drawText('Técnico Local', { x: col2X, y: currentY, size: 9, font: fontRegular });
        page.drawText('02', { x: col3X, y: currentY, size: 9, font: fontRegular });

        currentY -= mmToPt(6);
        this.drawLine(page, marginX, currentY, marginX + tableW, currentY);

        // Responsibles
        const respLeftX = marginX + mmToPt(2);
        const respRightX = marginX + mmToPt(100);

        currentY -= mmToPt(6);
        page.drawText('Responsável da obra 601 DCDC', { x: respLeftX, y: currentY, size: 9, font: fontRegular });
        page.drawText('Geraldo Donizete Vieira Siqueira', { x: respRightX, y: currentY, size: 9, font: fontBold });

        currentY -= mmToPt(6);
        page.drawText('Responsável da obra 601 DCDC', { x: respLeftX, y: currentY, size: 9, font: fontRegular });
        page.drawText('Anderson Ap. Pim Marques', { x: respRightX, y: currentY, size: 9, font: fontBold });

        currentY -= mmToPt(6);
        page.drawText('Técnico em Seg. do Trabalho da Obra 601', { x: respLeftX, y: currentY, size: 9, font: fontRegular });
        page.drawText('José Bispo Dantas', { x: respRightX, y: currentY, size: 9, font: fontBold });

        currentY -= mmToPt(6);
        this.drawLine(page, marginX, currentY, marginX + tableW, currentY);

        // Obra Name & Address
        currentY -= mmToPt(10);
        page.drawText('Obra 601 - DCDC - Campinas', { x: respLeftX, y: currentY, size: 10, font: fontBold });
        currentY -= mmToPt(5);
        page.drawText('Rodovia Anhanguera, KM 104 - Techno Park - Campinas/SP', { x: respLeftX, y: currentY, size: 9, font: fontRegular });

        // Photo Area placeholder
        currentY -= mmToPt(15);
        page.drawText('Foto de entrada Obra', { x: respLeftX, y: currentY, size: 10, font: fontBold });
        
        currentY -= mmToPt(5);
        const rectHeight = mmToPt(100);
        page.drawRectangle({
            x: marginX,
            y: currentY - rectHeight,
            width: tableW,
            height: rectHeight,
            borderColor: black,
            borderWidth: 1
        });
        
        // Centered text for missing photo
        page.drawText('(Foto será inserida aqui dinamicamente)', {
            x: marginX + mmToPt(50),
            y: currentY - (rectHeight / 2),
            size: 10,
            font: fontRegular,
            color: darkGray
        });

        return Buffer.from(await pdfDoc.save());
    }
}
