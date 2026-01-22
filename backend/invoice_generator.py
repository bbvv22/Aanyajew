from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from io import BytesIO
from datetime import datetime

# Business Details
BUSINESS_INFO = {
    "name": "ANNYA JEWELLERS",
    "address_lines": [
        "123 Jubilee Hills, Road No. 45",
        "Hyderabad, Telangana, 500033",
        "India"
    ],
    "gstin": "36AABCU9603R1Z2", # Sample GSTIN for Telangana (36)
    "phone": "+91 99999 00000",
    "email": "support@annya.com",
    "website": "www.annyajewellers.com",
    "state_code": "36" # Telangana
}

def format_currency(amount):
    return f"₹{amount:,.2f}"

def generate_invoice_pdf(order):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    story = []
    styles = getSampleStyleSheet()

    # Custom Styles
    styles.add(ParagraphStyle(name='InvoiceTitle', parent=styles['Heading1'], alignment=1, fontSize=16, spaceAfter=20))
    styles.add(ParagraphStyle(name='SectionHeader', parent=styles['Heading2'], fontSize=12, spaceAfter=5, textColor=colors.HexColor("#c4ad94")))
    styles.add(ParagraphStyle(name='NormalSmall', parent=styles['Normal'], fontSize=9, leading=12))
    styles.add(ParagraphStyle(name='BusinessName', parent=styles['Heading2'], fontSize=14, spaceAfter=2, textColor=colors.HexColor("#333333")))

    # 1. Header
    # Left: Business Info, Right: Invoice Details
    
    # Calculate Tax Type based on State
    customer_state = order.shipping_address.get('state', '').title()
    is_inter_state = customer_state.lower() != "telangana"
    tax_type = "IGST" if is_inter_state else "CGST+SGST"

    header_data = [
        [
            Paragraph(f"<b>{BUSINESS_INFO['name']}</b>", styles['BusinessName']),
            Paragraph(f"<b>INVOICE</b>", styles['InvoiceTitle'])
        ],
        [
            Paragraph("<br/>".join(BUSINESS_INFO['address_lines']) + f"<br/>GSTIN: {BUSINESS_INFO['gstin']}", styles['NormalSmall']),
            Paragraph(f"<b>Invoice #:</b> INV-{order.order_number}<br/><b>Date:</b> {order.created_at.strftime('%d-%b-%Y')}<br/><b>Order #:</b> {order.order_number}", styles['NormalSmall'])
        ]
    ]

    header_table = Table(header_data, colWidths=[3.5*inch, 2.5*inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,-1), 'RIGHT'),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 20))

    # 2. Bill To / Ship To
    customer_info = f"""
    <b>{order.shipping_address.get('firstName')} {order.shipping_address.get('lastName')}</b><br/>
    {order.shipping_address.get('address')}<br/>
    {order.shipping_address.get('city')}, {order.shipping_address.get('state')}<br/>
    {order.shipping_address.get('pincode')}<br/>
    Phone: {order.shipping_address.get('phone')}<br/>
    Place of Supply: {customer_state} ({tax_type})
    """
    
    addr_data = [
        [Paragraph("<b>Bill To / Ship To:</b>", styles['SectionHeader'])],
        [Paragraph(customer_info, styles['NormalSmall'])]
    ]
    addr_table = Table(addr_data, colWidths=[6*inch])
    story.append(addr_table)
    story.append(Spacer(1, 15))

    # 3. Line Items
    # Columns: Product, HSN, Qty, Rate, Taxable, Tax (CGST/SGST/IGST), Total
    
    if is_inter_state:
        headers = ["Product", "HSN", "Qty", "Rate", "Taxable", "IGST (3%)", "Total"]
        col_widths = [2.5*inch, 0.6*inch, 0.4*inch, 0.8*inch, 0.8*inch, 0.7*inch, 0.8*inch]
    else:
        headers = ["Product", "HSN", "Qty", "Rate", "Taxable", "CGST (1.5%)", "SGST (1.5%)", "Total"]
        col_widths = [2.0*inch, 0.6*inch, 0.4*inch, 0.8*inch, 0.8*inch, 0.7*inch, 0.7*inch, 0.8*inch]

    table_data = [headers]
    
    total_taxable = 0
    total_tax = 0
    grand_total = 0

    for item in order.items:
        # Assuming price is inclusive of tax for simplicity, but strictly should be derived.
        # Let's assume price provided IS the final price.
        # Back-calculate taxable: Price = Taxable * 1.03 (3% GST on Gold)
        
        final_price = item['price']
        qty = item['quantity']
        line_total = final_price * qty
        
        taxable_value = line_total / 1.03
        tax_amt = line_total - taxable_value
        rate_per_unit = taxable_value / qty
        
        total_taxable += taxable_value
        total_tax += tax_amt
        grand_total += line_total

        row = [
            Paragraph(item['name'], styles['NormalSmall']),
            "7113", # HSN for Jewellery
            str(qty),
            format_currency(rate_per_unit),
            format_currency(taxable_value)
        ]

        if is_inter_state:
            row.append(format_currency(tax_amt)) # IGST full
        else:
            row.append(format_currency(tax_amt/2)) # CGST half
            row.append(format_currency(tax_amt/2)) # SGST half
            
        row.append(format_currency(line_total))
        table_data.append(row)

    # Table Style
    item_table = Table(table_data, colWidths=col_widths)
    item_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f8f8f8")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor("#333333")),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('ALIGN', (0,0), (0,-1), 'LEFT'), # Product name left align
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('BOTTOMPADDING', (0,0), (-1,0), 10),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#eeeeee")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(item_table)
    story.append(Spacer(1, 10))

    # 4. Totals
    # Row for totals
    total_data = [
        ["", "Total Taxable Value:", format_currency(total_taxable)],
        ["", f"Total {'IGST' if is_inter_state else 'Tax'}:", format_currency(total_tax)],
        ["", "Grand Total:", format_currency(grand_total)]
    ]
    
    total_table = Table(total_data, colWidths=[4*inch, 1.5*inch, 1.5*inch])
    total_table.setStyle(TableStyle([
        ('ALIGN', (1,0), (1,-1), 'RIGHT'),
        ('ALIGN', (2,0), (2,-1), 'RIGHT'),
        ('FONTNAME', (-2,-1), (-1,-1), 'Helvetica-Bold'), # Grand Total Bold
        ('LINEABOVE', (1,-1), (-1,-1), 1, colors.black),
    ]))
    story.append(total_table)
    story.append(Spacer(1, 30))

    # 5. Footer / Declaration
    footer_text = """
    <b>Declaration:</b><br/>
    We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.<br/><br/>
    Authorized Signatory<br/><br/><br/>
    For ANNYA JEWELLERS
    """
    story.append(Paragraph(footer_text, styles['NormalSmall']))

    doc.build(story)
    buffer.seek(0)
    return buffer
