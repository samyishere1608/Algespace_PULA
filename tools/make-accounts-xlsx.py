"""Turns the account handout CSV into a printable Excel workbook for the study.

The CSV written by tools/create-accounts.mjs stays the source of truth (it is what --verify checks
against); this only formats it. Passwords are in the file, so the workbook is gitignored alongside
the CSV and must not be emailed to students as a whole - cut it up into the rows each student gets.

    python tools/make-accounts-xlsx.py jp-test-student-accounts.csv jp-test-student-accounts.xlsx
"""
import csv
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo

LOGIN_URL = "https://algespacepula.netlify.app/student/login"
INK = "012638"
ACCENT = "219EBC"
BAND = "EAF4F8"
HEADER_FILL = PatternFill("solid", fgColor=INK)
BAND_FILL = PatternFill("solid", fgColor=BAND)
THIN = Side(style="thin", color="C9D6DD")
BORDER = Border(bottom=THIN)


def read_csv(path):
    with open(path, newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def write_sheet(workbook, title, rows, first=False):
    sheet = workbook.active if first else workbook.create_sheet()
    sheet.title = title

    sheet["A1"] = "AlgeSPACE - student logins"
    sheet["A1"].font = Font(name="Calibri", size=16, bold=True, color=INK)
    sheet["A2"] = LOGIN_URL
    sheet["A2"].hyperlink = LOGIN_URL
    sheet["A2"].font = Font(name="Calibri", size=11, color=ACCENT, underline="single")
    sheet["A3"] = f"{len(rows)} accounts | password is the same for each row | keep this sheet private"
    sheet["A3"].font = Font(name="Calibri", size=10, italic=True, color="5A6B75")

    headers = ["Username", "Password", "Student ID", "Status", "Handed out to", "Checked"]
    header_row = 5
    for column, name in enumerate(headers, start=1):
        cell = sheet.cell(row=header_row, column=column, value=name)
        cell.font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        cell.fill = HEADER_FILL
        cell.alignment = Alignment(horizontal="left", vertical="center")
    sheet.row_dimensions[header_row].height = 22

    for offset, row in enumerate(rows, start=1):
        values = [row["username"], row["password"], int(row["id"]), row["status"], "", ""]
        for column, value in enumerate(values, start=1):
            cell = sheet.cell(row=header_row + offset, column=column, value=value)
            cell.font = Font(name="Calibri", size=11)
            cell.border = BORDER
            cell.alignment = Alignment(horizontal="left", vertical="center")
            if offset % 2 == 0:
                cell.fill = BAND_FILL

    last_row = header_row + len(rows)
    widths = [26, 14, 12, 26, 24, 12]
    for column, width in enumerate(widths, start=1):
        sheet.column_dimensions[get_column_letter(column)].width = width

    sheet.freeze_panes = f"A{header_row + 1}"
    sheet.auto_filter.ref = f"A{header_row}:{get_column_letter(len(headers))}{last_row}"

    # Printing: one landscape page per 40 rows, header repeated, so it can be cut into strips.
    sheet.page_setup.orientation = "landscape"
    sheet.page_setup.fitToWidth = 1
    sheet.page_setup.fitToHeight = 0
    sheet.sheet_properties.pageSetUpPr.fitToPage = True
    sheet.print_title_rows = f"{header_row}:{header_row}"

    table = Table(displayName=f"{title}Table", ref=f"A{header_row}:{get_column_letter(len(headers))}{last_row}")
    table.tableStyleInfo = TableStyleInfo(name="TableStyleLight1", showRowStripes=False)
    sheet.add_table(table)

    return sheet


def main():
    source = Path(sys.argv[1] if len(sys.argv) > 1 else "jp-test-student-accounts.csv")
    target = Path(sys.argv[2] if len(sys.argv) > 2 else source.with_suffix(".xlsx"))

    rows = read_csv(source)
    students = [r for r in rows if "tester" not in r["status"]]
    testers = [r for r in rows if "tester" in r["status"]]
    others = [r for r in rows if r not in students and r not in testers]

    workbook = Workbook()
    write_sheet(workbook, "Students", students, first=True)
    if testers:
        write_sheet(workbook, "Testers", testers)
    if others:
        write_sheet(workbook, "Other", others)

    workbook.save(target)
    print(f"{target}  ({len(students)} students, {len(testers)} testers)")


if __name__ == "__main__":
    main()
