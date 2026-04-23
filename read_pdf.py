import PyPDF2
import sys

def read_pdf(file_path):
    with open(file_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        for page_num in range(len(reader.pages)):
            page = reader.pages[page_num]
            print(f"--- Page {page_num + 1} ---")
            print(page.extract_text())

if __name__ == '__main__':
    read_pdf('DPBARROS/Relatorio obra 601 - 17-04-2026.pdf')
