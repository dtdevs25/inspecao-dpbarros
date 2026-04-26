import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { s3 } from '../s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';

const mmToPt = (mm: number) => mm * 2.83465;

export class TechnicalVisitService {
    private static ASSETS_PATH = path.join(process.cwd(), 'server', 'assets', 'reports');

    private static async getRemoteImageBuffer(url: string): Promise<Buffer | null> {
        try {
            console.log('Fetching buffer for Technical Visit PDF:', url);
            // Handle internal S3 proxy URLs
            if (url.includes('/api/files/')) {
                const parts = url.split('/');
                const filesIndex = parts.indexOf('files');
                if (filesIndex > -1 && filesIndex + 2 < parts.length) {
                    const bucket = parts[filesIndex + 1];
                    const key = parts.slice(filesIndex + 2).join('/');
                    console.log('S3 Direct Fetch for PDF:', bucket, key);
                    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
                    const s3Response = await s3.send(command).catch(err => {
                        console.warn(`S3 Error for ${bucket}/${key}:`, err.message);
                        return null;
                    });
                    if (!s3Response || !s3Response.Body) return null;
                    const chunks = [];
                    for await (const chunk of s3Response.Body as any) chunks.push(chunk);
                    return Buffer.concat(chunks);
                }
            }

            // Fallback to fetch for external URLs
            const response = await fetch(url);
            if (!response.ok) return null;
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        } catch (e) {
            console.error('Error in getRemoteImageBuffer:', e);
            return null;
        }
    }

    private static async getLocalImageBuffer(filename: string): Promise<Buffer | null> {
        try {
            const possiblePaths = [
                path.join(this.ASSETS_PATH, filename),
                path.join(process.cwd(), 'DPBARROS', 'logos', filename)
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

    private static drawTextWrapped(page: PDFPage, text: string, x: number, y: number, options: { font: PDFFont, size: number, color?: any, maxWidth?: number }): number {
        const { font, size, color = rgb(0, 0, 0), maxWidth = 300 } = options;
        const cleanText = (text || '').replace(/[\r\n\t]+/g, ' ');
        const words = cleanText.split(' ');
        let line = '';
        let currentY = y;
        
        for (const word of words) {
            if (!word) continue;
            const testLine = line + (line ? ' ' : '') + word;
            try {
                if (font.widthOfTextAtSize(testLine, size) < maxWidth) {
                    line = testLine;
                } else {
                    if (line) page.drawText(line, { x, y: currentY, size, font, color });
                    line = word;
                    currentY -= size * 1.2;
                }
            } catch (e) { line = testLine; }
        }
        if (line) page.drawText(line, { x, y: currentY, size, font, color });
        return currentY - size * 1.2;
    }

    private static async drawHeader(page: PDFPage, visit: any, pdfDoc: PDFDocument, fontBold: PDFFont, fontRegular: PDFFont, pageNumber: number, totalPages: number, subtitle: string) {
        const marginX = mmToPt(15);
        let currentY = mmToPt(297) - mmToPt(15);
        const black = rgb(0,0,0);
        const tableW = mmToPt(180);

        // Header Table Grid (based on model image)
        // Row 1 & 2 Left: Logo (Spans both)
        // Row 1 Middle: VISITA TECNICA
        // Row 2 Middle: Relatorio Fotografico | Right: Pagina X de Y
        // Row 3: Headers (Data, Responsavel, Revisao)
        // Row 4: Values
        // Row 5+: Custom Responsibles

        const headerH = mmToPt(48.5);
        page.drawRectangle({ x: marginX, y: currentY - headerH, width: tableW, height: headerH, borderColor: black, borderWidth: 1 });

        // Left Column (Logo) - Spans 2 rows
        const colLogoW = mmToPt(45);
        this.drawLine(page, marginX + colLogoW, currentY, marginX + colLogoW, currentY - mmToPt(20));
        
        const logoBuf = await this.getLocalImageBuffer('sesmt.png');
        if (logoBuf) {
            try {
                const logo = await pdfDoc.embedPng(logoBuf);
                const dims = logo.scaleToFit(colLogoW - mmToPt(4), mmToPt(16));
                page.drawImage(logo, { 
                    x: marginX + (colLogoW - dims.width)/2, 
                    y: currentY - mmToPt(2) - (mmToPt(16) - dims.height)/2 - dims.height, 
                    width: dims.width, 
                    height: dims.height 
                });
            } catch (e) { }
        }

        // Row 1: VISITA TÉCNICA
        const row1H = mmToPt(8);
        const drawCentered = (txt: string, x: number, w: number, y: number, f: PDFFont, s: number) => {
            page.drawText(txt, { x: x + (w - f.widthOfTextAtSize(txt, s))/2, y, font: f, size: s });
        };

        drawCentered('VISITA TÉCNICA', marginX + colLogoW, tableW - colLogoW, currentY - mmToPt(6), fontBold, 12);
        currentY -= row1H;
        this.drawLine(page, marginX + colLogoW, currentY, marginX + tableW, currentY);

        // Row 2: Subtitle | Page
        const row2H = mmToPt(12);
        const colPageW = mmToPt(35);
        this.drawLine(page, marginX + tableW - colPageW, currentY, marginX + tableW - colPageW, currentY - row2H);
        
        drawCentered(subtitle.toUpperCase(), marginX + colLogoW, tableW - colLogoW - colPageW, currentY - mmToPt(8), fontBold, 11);
        drawCentered(`Página ${pageNumber} de ${totalPages}`, marginX + tableW - colPageW, colPageW, currentY - mmToPt(8), fontRegular, 9);
        
        currentY -= row2H;
        this.drawLine(page, marginX, currentY, marginX + tableW, currentY);

        // Row 3: Headers
        const row3H = mmToPt(7);
        const col1W = mmToPt(45);
        const col3W = mmToPt(35);
        const col2W = tableW - col1W - col3W;
        this.drawLine(page, marginX + col1W, currentY, marginX + col1W, currentY - row3H);
        this.drawLine(page, marginX + col1W + col2W, currentY, marginX + col1W + col2W, currentY - row3H);

        drawCentered('Data de Emissão', marginX, col1W, currentY - mmToPt(5), fontBold, 9);
        drawCentered('Responsável', marginX + col1W, col2W, currentY - mmToPt(5), fontBold, 9);
        drawCentered('Revisão', marginX + col1W + col2W, col3W, currentY - mmToPt(5), fontBold, 9);
        currentY -= row3H;
        this.drawLine(page, marginX, currentY, marginX + tableW, currentY);

        // Row 4: Values
        const row4H = mmToPt(8);
        this.drawLine(page, marginX + col1W, currentY, marginX + col1W, currentY - row4H);
        this.drawLine(page, marginX + col1W + col2W, currentY, marginX + col1W + col2W, currentY - row4H);
        const dateStr = visit.date ? new Date(visit.date).toLocaleDateString('pt-BR') : '';
        drawCentered(dateStr, marginX, col1W, currentY - mmToPt(6), fontRegular, 9);
        drawCentered(visit.registeredBy || '', marginX + col1W, col2W, currentY - mmToPt(6), fontRegular, 9);
        drawCentered('03', marginX + col1W + col2W, col3W, currentY - mmToPt(6), fontRegular, 9);
        currentY -= row4H;
        this.drawLine(page, marginX, currentY, marginX + tableW, currentY);

        // Row 5, 6, 7: Custom Responsibles (Engineers and Safety Tech)
        const rowRespH = mmToPt(6.5);
        const labelColW = mmToPt(85);
        
        const drawRespRow = (label: string, value: string) => {
            this.drawLine(page, marginX + labelColW, currentY, marginX + labelColW, currentY - rowRespH);
            page.drawText(label, { x: marginX + mmToPt(2), y: currentY - mmToPt(5), size: 8, font: fontBold });
            page.drawText(value || 'Não informado', { x: marginX + labelColW + mmToPt(2), y: currentY - mmToPt(5), size: 8, font: fontRegular });
            currentY -= rowRespH;
            if (currentY > mmToPt(297) - mmToPt(15) - headerH) {
                this.drawLine(page, marginX, currentY, marginX + tableW, currentY);
            }
        };

        const unitDisplay = visit.unitName || '';
        drawRespRow(`Responsável da Obra ${unitDisplay}`, visit.engineerResponsible || '');
        drawRespRow(`Técnico em Seg. do Trabalho da Obra ${unitDisplay}`, visit.technicianResponsible || '');

        return mmToPt(297) - mmToPt(15) - headerH;
    }

    public static async generateReport(visit: any, prisma: any): Promise<Buffer> {
        const pdfDoc = await PDFDocument.create();
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
        
        let unitAddress = '';
        if (visit.unitId) {
            const unit = await prisma.unit.findUnique({ where: { id: visit.unitId } });
            if (unit && unit.address) unitAddress = unit.address;
        }
        visit.unitAddress = unitAddress;

        let inspections = [];
        if (visit.inspectionIds && visit.inspectionIds.length > 0) {
            inspections = await prisma.inspection.findMany({
                where: { id: { in: visit.inspectionIds } }
            });
        }

        const totalPages = 2 + inspections.length + 1; // Cover + Doc + Inspections + Checklist (approx 1 page)
        let pageNum = 1;

        await this.createCoverPage(pdfDoc, visit, fontBold, fontRegular, pageNum++, totalPages);
        await this.createDocumentationPage(pdfDoc, visit, fontBold, fontRegular, pageNum++, totalPages);

        for (const inspection of inspections) {
            await this.createInspectionPage(pdfDoc, visit, inspection, fontBold, fontRegular, pageNum++, totalPages);
        }

        await this.createChecklistPages(pdfDoc, visit, fontBold, fontRegular, pageNum++, totalPages);

        const pages = pdfDoc.getPages();
        for (let i = 0; i < pages.length; i++) {
            const p = pages[i];
            const footerY = mmToPt(10);
            p.drawLine({
                start: { x: mmToPt(15), y: footerY + mmToPt(10) },
                end: { x: mmToPt(210) - mmToPt(15), y: footerY + mmToPt(10) },
                thickness: 0.5,
                color: rgb(0.5, 0.5, 0.5)
            });
            p.drawRectangle({
                x: mmToPt(210) - mmToPt(25),
                y: footerY,
                width: mmToPt(10),
                height: mmToPt(10),
                color: rgb(0.5, 0.5, 0.5)
            });
            p.drawText(`${i + 1}`, {
                x: mmToPt(210) - mmToPt(20) - fontBold.widthOfTextAtSize(`${i + 1}`, 10) / 2,
                y: footerY + mmToPt(3),
                size: 10,
                font: fontBold,
                color: rgb(1, 1, 1)
            });
        }

        return Buffer.from(await pdfDoc.save());
    }

    private static async createCoverPage(pdfDoc: PDFDocument, visit: any, fontBold: PDFFont, fontRegular: PDFFont, pageNumber: number, totalPages: number) {
        const page = pdfDoc.addPage([mmToPt(210), mmToPt(297)]);
        let currentY = await this.drawHeader(page, visit, pdfDoc, fontBold, fontRegular, pageNumber, totalPages, 'Relatório Fotográfico');
        
        currentY -= mmToPt(10);
        const marginX = mmToPt(15);
        const tableW = mmToPt(180);
        const rowH = mmToPt(8);
        const drawCentered = (txt: string, x: number, w: number, y: number, f: PDFFont, s: number) => {
            page.drawText(txt, { x: x + (w - f.widthOfTextAtSize(txt, s))/2, y, font: f, size: s });
        };

        const obraName = visit.unitName || 'Não Informada';
        
        // Obra Name Table
        page.drawRectangle({ x: marginX, y: currentY - rowH, width: tableW, height: rowH, borderColor: rgb(0,0,0), borderWidth: 0.5 });
        drawCentered(obraName, marginX, tableW, currentY - mmToPt(6), fontBold, 10);
        currentY -= rowH;
        
        // Address/Company Table
        page.drawRectangle({ x: marginX, y: currentY - rowH, width: tableW, height: rowH, borderColor: rgb(0,0,0), borderWidth: 0.5 });
        page.drawText(`Endereço: ${visit.unitAddress || visit.companyName || ''}`, { x: marginX + mmToPt(2), y: currentY - mmToPt(6), size: 10, font: fontRegular });
        currentY -= rowH;
        
        currentY -= mmToPt(15);
        drawCentered('Registro Fotográfico', marginX, tableW, currentY, fontBold, 14);
        currentY -= mmToPt(10);

        if (visit.photoUrl) {
            try {
                const imgUrl = visit.photoUrl.startsWith('http') || visit.photoUrl.startsWith('/api/') ? visit.photoUrl : `/api/files/foto-visita-dpbarros/${visit.photoUrl}`;
                const imgBuf = await this.getRemoteImageBuffer(imgUrl);
                if (imgBuf) {
                    const img = await pdfDoc.embedJpg(imgBuf).catch(() => pdfDoc.embedPng(imgBuf));
                    const newWidth = tableW;
                    const newHeight = (img.height / img.width) * newWidth;
                    page.drawImage(img, {
                        x: marginX,
                        y: currentY - newHeight,
                        width: newWidth,
                        height: newHeight
                    });
                    currentY -= (newHeight + mmToPt(8));
                } else {
                    currentY -= mmToPt(50);
                }
            } catch (e) {
                page.drawText('(Falha ao carregar foto da fachada)', { x: marginX, y: currentY - mmToPt(50), size: 12, font: fontRegular });
                currentY -= mmToPt(60);
            }
        } else {
             currentY -= mmToPt(50);
        }

        drawCentered(`FOTO DE ENTRADA OBRA - ${obraName.toUpperCase()}`, marginX, tableW, currentY, fontBold, 12);
    }

    private static async createDocumentationPage(pdfDoc: PDFDocument, visit: any, fontBold: PDFFont, fontRegular: PDFFont, pageNumber: number, totalPages: number) {
        const page = pdfDoc.addPage([mmToPt(210), mmToPt(297)]);
        let currentY = await this.drawHeader(page, visit, pdfDoc, fontBold, fontRegular, pageNumber, totalPages, 'Relatório Fotográfico');
        
        currentY -= mmToPt(15);
        page.drawText('1. Documentação SESMT', { x: mmToPt(15), y: currentY, size: 14, font: fontBold });
        currentY -= mmToPt(10);
        page.drawText('Comentário:', { x: mmToPt(15), y: currentY, size: 12, font: fontRegular });
        
        currentY -= mmToPt(10);
        const line = (label: string, val: string) => {
            page.drawText(`${label} = Status = `, { x: mmToPt(15), y: currentY, size: 11, font: fontBold });
            page.drawText(val, { x: mmToPt(15) + fontBold.widthOfTextAtSize(`${label} = Status = `, 11), y: currentY, size: 11, font: fontRegular });
            currentY -= mmToPt(8);
        };

        line('PGR', visit.pgr || 'Entregue');
        line('INTEGRAÇÃO', visit.integracao || 'Sendo realizada de acordo com padrão.');
        line('FICHA DE EPI\'s', visit.fichaEpi || 'Sendo realizada de acordo com padrão.');
        line('TREINAMENTOS', visit.treinamentos || 'Sendo realizada de acordo com padrão.');
        line('DDS', visit.dds || 'DDS realizado 1 vez por semana com diversos temas.');
        line('APR (Análise Preliminar de Risco)', visit.apr || 'Sendo realizada de acordo com padrão.');
        line('CHECK LIST', visit.checkList || 'Sendo realizada de acordo com padrão.');

        currentY -= mmToPt(15);
        page.drawText('2. NR-26 Sinalização', { x: mmToPt(15), y: currentY, size: 14, font: fontBold });
        currentY -= mmToPt(10);
        currentY = this.drawTextWrapped(page, '26.1.1 Devem ser adotadas cores para segurança em estabelecimentos ou locais de trabalho, a fim de indicar e advertir acerca dos riscos existentes.', mmToPt(15), currentY, { font: fontRegular, size: 11, maxWidth: mmToPt(180) });
        
        currentY -= mmToPt(15);
        page.drawText('3. Organização e Limpeza', { x: mmToPt(15), y: currentY, size: 14, font: fontBold });
        currentY -= mmToPt(10);
        currentY = this.drawTextWrapped(page, '18.1.1 Esta Norma Regulamentadora - NR tem o objetivo de estabelecer diretrizes de ordem administrativa, de planejamento e de organização, que visam à implementação de medidas de controle e sistemas preventivos de segurança nos processos, nas condições e no meio ambiente de trabalho na indústria da construção.', mmToPt(15), currentY, { font: fontRegular, size: 11, maxWidth: mmToPt(180) });
    }

    private static async createInspectionPage(pdfDoc: PDFDocument, visit: any, inspection: any, fontBold: PDFFont, fontRegular: PDFFont, pageNumber: number, totalPages: number) {
        const page = pdfDoc.addPage([mmToPt(210), mmToPt(297)]);
        let currentY = await this.drawHeader(page, visit, pdfDoc, fontBold, fontRegular, pageNumber, totalPages, 'Relatório Fotográfico');
        
        // Image
        if (inspection.image) {
            try {
                const imgUrl = inspection.image.startsWith('http') || inspection.image.startsWith('/api/') ? inspection.image : `/api/files/foto-inspecao-dpbarros/${inspection.image}`;
                const imgBuf = await this.getRemoteImageBuffer(imgUrl);
                if (imgBuf) {
                    const img = await pdfDoc.embedJpg(imgBuf).catch(() => pdfDoc.embedPng(imgBuf));
                    const maxWidth = mmToPt(160);
                    const maxHeight = mmToPt(100);
                    const dims = img.scaleToFit(maxWidth, maxHeight);
                    page.drawImage(img, {
                        x: mmToPt(105) - dims.width / 2,
                        y: currentY - mmToPt(110),
                        width: dims.width,
                        height: dims.height
                    });
                }
            } catch (e) {
                console.error('Error embedding inspection image:', e);
                page.drawText('(Falha ao carregar foto da inspeção)', { x: mmToPt(80), y: currentY - mmToPt(50), size: 10, font: fontRegular });
            }
        } else {
            page.drawText('(Sem foto de evidência)', { x: mmToPt(90), y: currentY - mmToPt(50), size: 12, font: fontRegular });
        }

        currentY -= mmToPt(120);

        // TABLE: CONFORMIDADE / AÇÃO CORRETIVA
        const tableW = mmToPt(180);
        const col1W = mmToPt(40);
        const marginX = mmToPt(15);
        
        // Header
        page.drawRectangle({ x: marginX, y: currentY - mmToPt(8), width: tableW, height: mmToPt(8), color: rgb(0.15, 0.15, 0.15) });
        page.drawText('CONFORMIDADE / AÇÃO CORRETIVA', { x: marginX + mmToPt(50), y: currentY - mmToPt(6), size: 10, font: fontBold, color: rgb(1,1,1) });
        currentY -= mmToPt(8);

        const drawRow = (label: string, value: string, height = 12) => {
            const h = mmToPt(height);
            page.drawRectangle({ x: marginX, y: currentY - h, width: tableW, height: h, borderColor: rgb(0,0,0), borderWidth: 0.5 });
            this.drawLine(page, marginX + col1W, currentY, marginX + col1W, currentY - h);
            page.drawText(label, { x: marginX + mmToPt(2), y: currentY - mmToPt(5), size: 9, font: fontBold });
            
            // Wrap text for value
            this.drawTextWrapped(page, value || 'Nada Consta', marginX + col1W + mmToPt(2), currentY - mmToPt(5), { font: fontRegular, size: 9, maxWidth: tableW - col1W - mmToPt(4) });
            currentY -= h;
        };

        drawRow('Conformidade', inspection.description || '', 18);
        drawRow('Risco/Perigo', inspection.risk || 'Nada Consta', 15);
        drawRow('Ação Imediata', inspection.resolution || 'Nada Consta', 15);
        drawRow('Ação Corretiva', inspection.correctiveAction || 'Nada Consta', 15);

        // Deadlines Row
        page.drawRectangle({ x: marginX, y: currentY - mmToPt(10), width: tableW, height: mmToPt(10), borderColor: rgb(0,0,0), borderWidth: 0.5 });
        const deadlineStr = inspection.deadline ? new Date(inspection.deadline).toLocaleDateString('pt-BR') : 'N/A';
        const finalDeadlineStr = inspection.finalDeadline ? new Date(inspection.finalDeadline).toLocaleDateString('pt-BR') : 'N/A';
        
        page.drawText(`Prazo Inicial: ${deadlineStr}`, { x: marginX + mmToPt(2), y: currentY - mmToPt(7), size: 9, font: fontBold });
        this.drawLine(page, marginX + mmToPt(90), currentY, marginX + mmToPt(90), currentY - mmToPt(10));
        page.drawText(`Prazo Final: ${finalDeadlineStr}`, { x: marginX + mmToPt(92), y: currentY - mmToPt(7), size: 9, font: fontBold });
    }


    private static async createChecklistPages(pdfDoc: PDFDocument, visit: any, fontBold: PDFFont, fontRegular: PDFFont, pageNumber: number, totalPages: number) {
        const CATS = [
            {id:'1.0',t:'Disposicoes Gerais',i:['1.1','1.2','1.3','1.4','1.5','1.6','1.7','1.8','1.9','1.10']},
            {id:'2.0',t:"EPIs - Equip. Protecao Individual",i:['2.1','2.2','2.3','2.4','2.5']},
            {id:'3.0',t:"EPCs - Equip. Protecao Coletiva",i:['3.1','3.2','3.3','3.4','3.5','3.6']},
            {id:'4.0',t:'Treinamentos',i:['4.1','4.2','4.3','4.4','4.5','4.6','4.7']},
            {id:'5.0',t:'Equipamentos Pesados (Veiculos)',i:['5.1','5.2','5.3','5.4','5.5']},
            {id:'6.0',t:'Documentacao de Seguranca',i:['6.1','6.2','6.3','6.4','6.5','6.6','6.7','6.8','6.9','6.10','6.11','6.12','6.13','6.14','6.15','6.16','6.17']},
            {id:'7.0',t:'Equipamentos Eletricos/Pneumaticos',i:['7.1','7.2','7.3','7.4','7.5','7.6','7.7','7.8','7.9']},
            {id:'8.0',t:'Canteiro de Obras - Vivencia',i:['8.1','8.2','8.3','8.4','8.5','8.6','8.7','8.8','8.9','8.10','8.11','8.12','8.13']},
            {id:'9.0',t:'Area de Vivencia - Via Publica',i:['9.1','9.2','9.3','9.4','9.5','9.6','9.7','9.8','9.9','9.10']},
            {id:'10.0',t:'Refeicao dos Colaboradores',i:['10.1','10.2','10.3']},
            {id:'11.0',t:'Transportes de Trabalhadores',i:['11.1','11.2','11.3','11.4','11.5','11.6']},
            {id:'12.0',t:'Escoramento de Valas',i:['12.1','12.2','12.3','12.4','12.5','12.6','12.7']},
            {id:'13.0',t:'Trabalhos de Solda em Tubulacoes',i:['13.1','13.2','13.3','13.4','13.5','13.6','13.7','13.8','13.9']},
            {id:'14.0',t:'Espacos Confinados (NR33)',i:['14.1','14.2','14.3','14.4','14.5','14.6']},
            {id:'15.0',t:'Trabalhos em Altura (NR35)',i:['15.1','15.2','15.3','15.4']},
            {id:'16.0',t:'Armazenamento Produtos Quimicos',i:['16.1','16.2','16.3','16.4','16.5']},
            {id:'17.0',t:'Trabalhos em Areas Alagadas',i:['17.1','17.2','17.3','17.4']},
            {id:'18.0',t:'Trabalhos de Pavimentacao',i:['18.1','18.2','18.3','18.4','18.5']},
            {id:'19.0',t:'Alojamento',i:['19.1','19.2','19.3','19.4','19.5','19.6','19.7','19.8','19.9']},
            {id:'20.0',t:'Guaritas dos Controladores de Acesso',i:['20.1','20.2','20.3','20.4','20.5','20.6','20.7']},
            {id:'21.0',t:'Abastecimento dos Maquinarios',i:['21.1','21.2','21.3','21.4','21.5']},
            {id:'22.0',t:'Condicoes Adequadas para o SESMT',i:['22.1','22.2','22.3','22.4','22.5','22.6','22.7','22.8','22.9']},
            {id:'23.0',t:'Instalacoes Eletricas - NR-18 e NR-10',i:['23.1','23.2','23.3','23.4','23.5','23.6','23.7','23.8','23.9','23.10']},
            {id:'24.0',t:'Escavacao, Fundacao e Desmonte de Rocha',i:['24.1','24.2','24.3','24.4']},
        ] as const;

        const TEXTS: Record<string,string> = {
            '1.1':'Comunicacao previa a DRT realizada','1.2':'Inventario de risco e PGR elaborados','1.3':'Ordens de servico sobre seguranca elaboradas','1.4':'Ciencia das ordens de servico dada aos empregados','1.5':'Dimensionamento SESMT conforme NR04','1.6':'Composicao CIPA conforme NR05','1.7':'CIPA elaborou e divulgou mapa de risco','1.8':'Mapa de risco visivel no canteiro','1.9':'Prontuario de funcionarios mantido na obra','1.10':'Obra limpa e organizada sem entulhos',
            '2.1':'EPI utilizado adequadamente para a funcao','2.2':'EPIs em boas condicoes de uso','2.3':'Fichas EPI com CA atualizadas','2.4':'Treinamento de uso e guarda do EPI realizado','2.5':'Estoque de EPIs no canteiro',
            '3.1':'Sinalizacao: cavaletes, placas, fita zebrada, cones','3.2':'Isolamentos: Guarda Corpo, Tapumes e barreiras','3.3':'Transporte de materiais com cabos e cintas adequados','3.4':'Armazenamento de materiais adequado','3.5':'Vergalhoes devidamente tampados','3.6':'Fornecimento e registro de protetor solar e luva quimica',
            '4.1':'Treinamento admissional com minimo 4 horas','4.2':'DDS - Dialogo Diario de Seguranca realizado','4.3':'Treinamento especifico (eletricista, operador, etc.)','4.4':'Treinamento NR10 - Instalacoes Eletricas','4.5':'Treinamento NR23 - Primeiros Socorros/Brigadista','4.6':'Treinamento NR33 - Espaco Confinado','4.7':'Treinamento NR35 - Trabalho em Altura',
            '5.1':'Check List realizado para todos equipamentos pesados','5.2':'Condicao ext/int.: alarme, retrovisores, pneus, freios','5.3':'Operador habilitado conforme codigo de transito','5.4':'Operador qualificado conforme NR12','5.5':'Sem vazamento de oleo/combustivel',
            '6.1':'PGR conforme NR9','6.2':'PCMSO conforme NR7','6.3':'PAE elaborado','6.4':'PAE divulgado e disponivel no canteiro','6.5':'APR conforme atividades/etapas','6.6':'Check List de Equipamentos','6.7':'Documentos de funcionarios registrados','6.8':'Procedimentos de Trabalho (PET, PT, etc.)','6.9':'Documentos disponiveis a fiscalizacao','6.10':'FDS dos produtos quimicos na obra','6.11':'CAs dos EPIs validos','6.12':'Relacao EPIs com especificacoes tecnicas','6.13':'Projetos area de vivencia por prof. habilitado','6.14':'Projeto eletrico temporario por prof. habilitado','6.15':'Projetos sistemas de protecao coletiva','6.16':'Projetos SPIQ por prof. habilitado','6.17':'Contratadas forneceram inventario de riscos',
            '7.1':'Protecao de partes moveis e carcaca','7.2':'Isolamento e conexao eletrica','7.3':'Check List dos equipamentos realizado','7.4':'Isolamento de chaves e cabos','7.5':'Sinalizacao dos equipamentos','7.6':'Protecao/Barreiras de seguranca','7.7':'Sem vazamento de oleo e combustivel','7.8':'Aterramento adequado','7.9':'Extintor de incendio no prazo de validade',
            '8.1':'Almoxarifado organizado','8.2':'Refeitorio com mesas e cadeiras suficientes','8.3':'Ventilacao suficiente no refeitorio','8.4':'Controle de qualidade da agua dos bebedouros','8.5':'Sanitarios em numero suficiente','8.6':'Chuveiros em numero suficiente','8.7':'Containers com aterramento e laudo eletrico','8.8':'Escritorios disponiveis','8.9':'Dimensionamento de extintores correto','8.10':'Kit de Primeiros Socorros','8.11':'Placas de sinalizacao e advertencia instaladas','8.12':'Vestiarios com armarios e bancos suficientes','8.13':'Protetor solar e luva quimica disponiveis',
            '9.1':'Controle qualidade da agua (via publica)','9.2':'Garrafas termicas e copos descartaveis para agua','9.3':'Mesas e assentos conforme no. de funcionarios','9.4':'Kits de higienizacao para maos','9.5':'Banheiro Quimico disponivel','9.6':'Protecoes contra intemperies (tenda)','9.7':'Kit de Primeiros Socorros','9.8':'Extintor de incendio disponivel','9.9':'Isolamento da area de vivencia','9.10':'Lixeiras disponiveis',
            '10.1':'Ha relatos de intoxicacao alimentar?','10.2':'Area de vivencia para refeicao fora do canteiro?','10.3':'Pesquisa de satisfacao realizada nos ultimos 12 meses',
            '11.1':'Transporte feito de forma adequada','11.2':'Boas condicoes externas e internas do veiculo','11.3':'Manutencao preventiva realizada','11.4':'Condutor habilitado conforme codigo de transito','11.5':'Sem vazamento de oleo e combustivel','11.6':'Check List do veiculo realizado',
            '12.1':'Escoramento condizente com o projeto','12.2':'Metodologia executiva adequada','12.3':'Escoramento de acordo com o padrao definido','12.4':'Escadas em boas condicoes na vala','12.5':'Material escavado > 1.0m da vala','12.6':'Funcionarios com treinamento especifico','12.7':'Formulario de escavacao de vala preenchido',
            '13.1':'Ventilacao adequada para trabalho de solda','13.2':'Iluminacao em 24 volts','13.3':'Mascara contra fumos metalicos utilizada','13.4':'Avental de raspa, mangote, perneira e jaleco','13.5':'Mascara de solda com protecao de radiacao','13.6':'Funcionario com treinamento para a funcao','13.7':'Extintor de incendio junto ao conjunto oxicorte','13.8':'Equipamento de solda com aterramento','13.9':'Cabos em condicoes de uso',
            '14.1':'Existem trabalhos em espacos confinados?','14.2':'Permissao de entrada em espaco confinado preenchida','14.3':'Procedimentos obrigatorios conforme NR33','14.4':'Todos os envolvidos com treinamento NR33','14.5':'Aferica constante de gases no espaco confinado','14.6':'Sistema de ventilacao autonomo para espaco confinado',
            '15.1':'Existem trabalhos em altura?','15.2':'Permissao de Trabalho em Altura preenchida e disponivel','15.3':'Procedimentos obrigatorios conforme NR35','15.4':'Todos os envolvidos com treinamento NR35',
            '16.1':'FDS dos produtos quimicos disponiveis no canteiro','16.2':'Produtos quimicos armazenados conforme NBR/NR20/NR26','16.3':'Inventario de produtos quimicos realizado','16.4':'Sinalizacao e dispositivos de emergencia presentes','16.5':'Existe armazenamento de combustivel na obra?',
            '17.1':'Existem trabalhos em areas alagadas?','17.2':'APR elaborado para areas alagadas','17.3':'Procedimentos de seguranca constam','17.4':'EPIs em acordo com riscos da APR',
            '18.1':'Existem trabalhos de pavimentacao asfaltica?','18.2':'APR elaborado para pavimentacao','18.3':'Procedimentos de seguranca constam','18.4':'EPIs em acordo com riscos da APR','18.5':'Colaboradores usam EPIs obrigatorios para pavimentacao',
            '19.1':'Cobertura contra intemperies no alojamento','19.2':'Piso e paredes em material resistente','19.3':'Iluminacao e ventilacao adequadas','19.4':'Beliches com escada e protecao lateral','19.5':'Colchoes com densidade 26','19.6':'Lencol, fronha e travesseiro disponiveis','19.7':'Armarios individuais com cadeado','19.8':'Agua potavel, filtrada e fresca','19.9':'Gas GLP instalado na area externa',
            '20.1':'Guarita em boas condicoes de conservacao','20.2':'Iluminacao e fiacao protegidas e aterradas','20.3':'Assento com conforto ergonomico','20.4':'Banheiro proximo aberto no periodo noturno','20.5':'Refeitorio com micro-ondas no periodo noturno','20.6':'Controlador de acesso com equipamentos energizados?','20.7':'Controlador de acesso aciona bombas?',
            '21.1':'Existe armazenamento de combustivel na obra?','21.2':'Abastecimento feito com isolamento de 7,5m','21.3':'Obra possui kit de mitigacao (KPA)','21.4':'Plano de emergencia e telefones de contato disponiveis','21.5':'Abastecedor habilitado, treinado e autorizado',
            '22.1':'Quadro SESMT dimensionado conforme NR04','22.2':'Sala para equipe de Seguranca do Trabalho','22.3':'Equipe SST com equipamento para impressao/scanner','22.4':'Equipe dispoe de computador','22.5':'Profissional SST com auxiliar administrativo','22.6':'Equipe SST com celular para comunicacao','22.7':'Estoques de EPI de acordo com o efetivo','22.8':'Dispositivos de sinalizacao para atividades SST','22.9':'Equipe SST participa das tomadas de decisao',
            '23.1':'Quadros eletricos sinalizados e identificados (NR-18.6.10)','23.2':'Circuitos eletricos identificados nos quadros','23.3':'Quadros com acesso desobstruido e espaco suficiente','23.4':'Partes vivas inacessiveis a nao-autorizados','23.5':'Protecao contra contatos diretos e indiretos','23.6':'Condutores em bom estado, isolados e dimensionados','23.7':'Sistema de aterramento eficiente','23.8':'Sinalizacao nas areas com risco eletrico','23.9':'Somente autorizados atuam em servicos eletricos','23.10':'Laudo tecnico sobre SPDA disponivel',
            '24.1':'Projeto de escavacao por profissional habilitado','24.2':'Escavacoes > 1,25m com taludes ou escoramento','24.3':'Escavacoes profundas com escadas ou rampas','24.4':'Escavacoes avaliadas quanto a redes subterraneas',
        };

        const answers: Record<string,string> = (visit.checklistAnswers as any) || {};
        const mx = mmToPt(15);
        const tw = mmToPt(180);
        const rh = mmToPt(6.5);
        const cCx  = mx + tw - mmToPt(28);
        const cNCx = mx + tw - mmToPt(18);
        const cNAx = mx + tw - mmToPt(8);
        const blk = rgb(0,0,0);
        const grn = rgb(0.09,0.62,0.32);
        const red = rgb(0.78,0.08,0.08);
        const blu = rgb(0.1,0.1,0.6);
        const lgray = rgb(0.88,0.88,0.88);

        let pg = pdfDoc.addPage([mmToPt(210), mmToPt(297)]);
        let cy = await this.drawHeader(pg, visit, pdfDoc, fontBold, fontRegular, pageNumber, totalPages, 'Checklist NRs');
        let pn = pageNumber + 1;

        cy -= mmToPt(5);
        pg.drawText(`No. de Funcionarios: ${visit.numberOfEmployees || '-'}`, { x: mx, y: cy, size: 10, font: fontBold, color: blk });
        cy -= mmToPt(5);
        pg.drawText('Legenda: C=Conforme  NC=Nao Conforme  NA=Nao se Aplica', { x: mx, y: cy, size: 8.5, font: fontRegular, color: blk });
        cy -= mmToPt(4);
        this.drawLine(pg, mx, cy, mx+tw, cy, blk, 0.8);
        cy -= mmToPt(1);

        const hdr = (p: PDFPage, y: number) => {
            p.drawText('C',  { x: cCx+mmToPt(1.5), y: y-mmToPt(5), size: 8, font: fontBold, color: blk });
            p.drawText('NC', { x: cNCx-mmToPt(1),  y: y-mmToPt(5), size: 8, font: fontBold, color: blk });
            p.drawText('NA', { x: cNAx-mmToPt(1),  y: y-mmToPt(5), size: 8, font: fontBold, color: blk });
        };
        hdr(pg, cy); cy -= mmToPt(7);
        this.drawLine(pg, mx, cy, mx+tw, cy, blk, 0.5);

        const ensure = async () => {
            if (cy < mmToPt(22)) {
                pg = pdfDoc.addPage([mmToPt(210), mmToPt(297)]);
                cy = await this.drawHeader(pg, visit, pdfDoc, fontBold, fontRegular, pn++, totalPages, 'Checklist NRs');
                cy -= mmToPt(4); hdr(pg, cy); cy -= mmToPt(7);
                this.drawLine(pg, mx, cy, mx+tw, cy, blk, 0.5);
            }
        };

        let ri = 0;
        for (const cat of CATS) {
            await ensure();
            pg.drawRectangle({ x: mx, y: cy-rh+mmToPt(1.2), width: tw, height: rh, color: rgb(0.15,0.15,0.15) });
            pg.drawText(`${cat.id}  ${cat.t}`, { x: mx+mmToPt(2), y: cy-mmToPt(5), size: 8, font: fontBold, color: rgb(1,1,1) });
            cy -= rh;
            for (const id of cat.i) {
                await ensure();
                const bg = ri%2===0 ? rgb(0.97,0.97,0.97) : rgb(1,1,1);
                pg.drawRectangle({ x: mx, y: cy-rh+mmToPt(1.2), width: tw, height: rh, color: bg });
                
                // Vertical lines for the checklist row
                this.drawLine(pg, mx, cy+mmToPt(1.2), mx, cy-rh+mmToPt(1.2), blk, 0.5);
                this.drawLine(pg, mx+tw, cy+mmToPt(1.2), mx+tw, cy-rh+mmToPt(1.2), blk, 0.5);
                this.drawLine(pg, cCx-mmToPt(2), cy+mmToPt(1.2), cCx-mmToPt(2), cy-rh+mmToPt(1.2), rgb(0.7,0.7,0.7), 0.5);

                pg.drawText(`${id}  ${(TEXTS[id]||'').substring(0,88)}`, { x: mx+mmToPt(2), y: cy-mmToPt(5), size: 7.5, font: fontRegular, color: blk });
                const a = answers[id]||'C';
                const by = cy-rh+mmToPt(2); const bh = mmToPt(4); const bw = mmToPt(6);
                pg.drawRectangle({ x: cCx,         y: by, width: bw,        height: bh, color: a==='C'  ? grn : lgray });
                pg.drawRectangle({ x: cNCx-mmToPt(1), y: by, width: bw+mmToPt(1), height: bh, color: a==='NC' ? red : lgray });
                pg.drawRectangle({ x: cNAx-mmToPt(1), y: by, width: bw+mmToPt(1), height: bh, color: a==='NA' ? blu : lgray });
                if (a==='C')  pg.drawText('C',  { x: cCx+mmToPt(1.5),  y: by+mmToPt(0.8), size: 7, font: fontBold, color: rgb(1,1,1) });
                if (a==='NC') pg.drawText('NC', { x: cNCx-mmToPt(0.5), y: by+mmToPt(0.8), size: 7, font: fontBold, color: rgb(1,1,1) });
                if (a==='NA') pg.drawText('NA', { x: cNAx-mmToPt(0.5), y: by+mmToPt(0.8), size: 7, font: fontBold, color: rgb(1,1,1) });
                this.drawLine(pg, mx, cy-rh+mmToPt(1.2), mx+tw, cy-rh+mmToPt(1.2), blk, 0.5);
                cy -= rh; ri++;
            }
        }

        // Final page - notes + signatures
        pg = pdfDoc.addPage([mmToPt(210), mmToPt(297)]);
        cy = await this.drawHeader(pg, visit, pdfDoc, fontBold, fontRegular, pn, totalPages, 'Anotacoes e Assinaturas');
        cy -= mmToPt(10);
        pg.drawText('Anotacoes de Nao Conformidade e/ou Recomendacoes:', { x: mx, y: cy, size: 11, font: fontBold, color: blk });
        cy -= mmToPt(5);
        pg.drawRectangle({ x: mx, y: cy-mmToPt(55), width: tw, height: mmToPt(55), borderColor: blk, borderWidth: 0.5, color: rgb(0.98,0.98,0.98) });
        if (visit.finalNotes) {
            let ny = cy - mmToPt(6);
            for (const line of String(visit.finalNotes).split('\n')) {
                ny = this.drawTextWrapped(pg, line, mx+mmToPt(2), ny, { font: fontRegular, size: 9, maxWidth: tw-mmToPt(4) });
                if (ny < cy-mmToPt(52)) break;
            }
        }
        cy -= mmToPt(60);
        cy -= mmToPt(8);
        pg.drawText('Prazo para Regularizacao:', { x: mx, y: cy, size: 11, font: fontBold, color: blk });
        cy -= mmToPt(4);
        this.drawLine(pg, mx, cy, mx+tw, cy, blk, 0.5);
        cy -= mmToPt(35);
        const sw = mmToPt(75);
        this.drawLine(pg, mx, cy, mx+sw, cy, blk, 0.5);
        this.drawLine(pg, mx+tw-sw, cy, mx+tw, cy, blk, 0.5);
        cy -= mmToPt(5);
        pg.drawText('Tecnico em Seguranca do Trabalho - SESMT Central', { x: mx, y: cy, size: 8, font: fontRegular, color: blk });
        pg.drawText('Responsavel da Obra', { x: mx+tw-sw, y: cy, size: 8, font: fontRegular, color: blk });
    }
}