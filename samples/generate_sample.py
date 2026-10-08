"""Script to generate a realistic Kenyan Non-Disclosure Agreement (NDA) PDF for testing and demonstration.
Uses ReportLab to build a 3-page document containing authentic legal clauses and intentional commercial red flags.
"""

import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, HRFlowable
from reportlab.lib import colors

def generate_kenyan_sample_nda(output_path: str = "samples/sample-nda.pdf") -> str:
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Title"],
        fontSize=16,
        leading=20,
        textColor=colors.HexColor("#0f172a"),
        alignment=1,
        fontName="Helvetica-Bold",
    )

    h2_style = ParagraphStyle(
        "SectionHeader",
        parent=styles["Heading2"],
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#1e293b"),
        fontName="Helvetica-Bold",
        spaceBefore=10,
        spaceAfter=4,
    )

    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6,
    )

    clause_style = ParagraphStyle(
        "Clause",
        parent=styles["Normal"],
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#1e293b"),
        leftIndent=14,
        spaceAfter=6,
    )

    story = []

    # ================= PAGE 1 =================
    story.append(Paragraph("MUTUAL NON-DISCLOSURE AND RESTRICTIVE COVENANTS AGREEMENT", title_style))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#059669"), spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "This Mutual Non-Disclosure Agreement (the <b>\"Agreement\"</b>) is entered into as of 15th October 2024 (the <b>\"Effective Date\"</b>), by and between:",
        body_style,
    ))

    story.append(Paragraph(
        "<b>1. NAIROBI DIGITAL INNOVATIONS LIMITED</b>, a limited liability company incorporated in Kenya (Registration No. CPR/2019/10423) with its registered office at Mirage Towers, Westlands, Nairobi (hereinafter referred to as the <b>\"Disclosing Party\"</b>); and",
        clause_style,
    ))

    story.append(Paragraph(
        "<b>2. BARAKA LOGISTICS & FREIGHT KENYA SME</b>, a private business registered under the Business Names Act of Kenya (Certificate No. BN-K7291) having its principal place of business in Industrial Area, Nairobi (hereinafter referred to as the <b>\"Recipient\"</b> or <b>\"SME Partner\"</b>).",
        clause_style,
    ))

    story.append(Paragraph("WHEREAS the Disclosing Party and the SME Partner desire to evaluate a potential distribution partnership relating to supply chain telemetry in East Africa (the <b>\"Purpose\"</b>).", body_style))

    story.append(Paragraph("1. DEFINITION OF CONFIDENTIAL INFORMATION", h2_style))
    story.append(Paragraph(
        "\"Confidential Information\" shall mean all non-public information, technical data, trade secrets, financial models, customer lists, pricing matrices, software code, and business plans disclosed directly or indirectly in writing, orally, or electronically. Any information disclosed orally shall be deemed confidential regardless of whether marked or memorialized.",
        body_style,
    ))

    story.append(Paragraph("2. OBLIGATIONS OF THE RECIPIENT", h2_style))
    story.append(Paragraph(
        "The Recipient shall exercise the utmost degree of care, not less than strict liability, to protect the Confidential Information. The Recipient shall not disclose, disseminate, reverse engineer, or exploit the Confidential Information for any commercial purpose other than the agreed Purpose.",
        body_style,
    ))

    story.append(Paragraph("3. EXCLUSIONS FROM CONFIDENTIALITY", h2_style))
    story.append(Paragraph(
        "Confidential Information shall not include information that: (a) is or becomes publicly available through no breach by Recipient; (b) was already known to Recipient prior to receipt; or (c) is required to be disclosed by order of a competent Kenyan court, provided Disclosing Party is given forty-eight (48) hours prior written notice.",
        body_style,
    ))

    story.append(PageBreak())

    # ================= PAGE 2 =================
    story.append(Paragraph("4. TERM AND PERPETUAL CONFIDENTIALITY [HIGH RISK]", h2_style))
    story.append(Paragraph(
        "This Agreement shall commence on the Effective Date. The duty of confidentiality and non-use under this Agreement shall survive the termination of commercial discussions and shall remain in perpetual effect for infinity without expiry across all jurisdictions.",
        body_style,
    ))

    story.append(Paragraph("5. UNREASONABLE NON-COMPETE & RESTRAINT OF TRADE [HIGH RISK]", h2_style))
    story.append(Paragraph(
        "<b>Clause 5.1 Restraint of Trade:</b> For a period of five (5) consecutive years following the termination or expiration of this Agreement, the Recipient shall not directly or indirectly engage, own, manage, consult, or provide freight logistics software or delivery services to any business operating within the Republic of Kenya or the East African Community (EAC).",
        clause_style,
    ))
    story.append(Paragraph(
        "<b>Clause 5.2 Non-Solicitation:</b> The Recipient shall not solicit, recruit, or hire any employee, independent contractor, customer, or logistics vendor of the Disclosing Party for a period of thirty-six (36) months.",
        clause_style,
    ))

    story.append(Paragraph("6. UNILATERAL INDEMNIFICATION AND LIQUIDATED DAMAGES [CRITICAL]", h2_style))
    story.append(Paragraph(
        "<b>Clause 6.1 Unilateral Indemnity:</b> The SME Partner agrees to defend, indemnify, and hold harmless Nairobi Digital Innovations Limited from any and all direct, indirect, consequential, punitive, and incidental damages, including attorney fees on a full indemnity basis, arising from any suspected breach of this Agreement.",
        clause_style,
    ))
    story.append(Paragraph(
        "<b>Clause 6.2 Pre-determined Liquidated Damages:</b> In the event of any alleged breach of Clause 1, 4, or 5 by the SME Partner, the SME Partner shall unconditionally pay to the Disclosing Party the sum of Kenya Shillings Ten Million (KES 10,000,000) as liquidated damages without requiring proof of actual financial damage.",
        clause_style,
    ))

    story.append(PageBreak())

    # ================= PAGE 3 =================
    story.append(Paragraph("7. DISPUTE RESOLUTION AND OFFSHORE JURISDICTION [HIGH RISK]", h2_style))
    story.append(Paragraph(
        "<b>Clause 7.1 Foreign Arbitration:</b> Any dispute, controversy, or claim arising out of or relating to this Agreement, including any question regarding its existence, validity, or termination, shall be referred to and finally resolved by arbitration administered by the London Court of International Arbitration (LCIA) seated in London, United Kingdom. The arbitration shall be conducted in English by a sole arbitrator. All administrative costs, venue fees, and deposits shall be borne in advance exclusively by the SME Partner.",
        clause_style,
    ))

    story.append(Paragraph("8. GOVERNING LAW AND STATUTORY REMEDIES", h2_style))
    story.append(Paragraph(
        "Subject to the arbitration clause above, this Agreement shall be governed by and construed in accordance with the Laws of Kenya, including the Law of Contract Act (Chapter 23, Laws of Kenya) and the Data Protection Act 2019.",
        body_style,
    ))

    story.append(Paragraph("9. ENTIRE AGREEMENT AND AMENDMENTS", h2_style))
    story.append(Paragraph(
        "This Agreement constitutes the entire agreement between the parties concerning the subject matter hereof and supersedes all prior discussions, term sheets, and draft memoranda. No amendment or waiver shall be valid unless executed in writing by both authorized directors.",
        body_style,
    ))

    story.append(Spacer(1, 14))
    story.append(Paragraph("IN WITNESS WHEREOF, the parties hereto have duly executed this Agreement:", body_style))
    story.append(Spacer(1, 14))

    signatures_html = """
    <b>FOR NAIROBI DIGITAL INNOVATIONS LIMITED:</b><br/><br/>
    Signature: _________________________________<br/>
    Name: Dr. Kamau Waithaka<br/>
    Title: Managing Director & CEO<br/>
    Date: 15th October 2024<br/><br/>
    <b>FOR BARAKA LOGISTICS & FREIGHT KENYA SME:</b><br/><br/>
    Signature: _________________________________<br/>
    Name: Achieng Odhiambo<br/>
    Title: Proprietor / Managing Director<br/>
    Date: 15th October 2024
    """
    story.append(Paragraph(signatures_html, body_style))

    doc.build(story)
    return output_path

if __name__ == "__main__":
    path = generate_kenyan_sample_nda()
    print(f"Realistic Kenyan sample NDA generated successfully at: {path}")
