import io
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.units import inch
from xml.sax.saxutils import escape
from datetime import datetime
from zoneinfo import ZoneInfo

_PKT = ZoneInfo('Asia/Karachi')

def _generated_line(summary: dict):
    """Report generation date/time in PKT, matching what the dashboard shows."""
    raw = summary.get('generated_at')
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(raw).astimezone(_PKT)
    except (ValueError, TypeError):
        return None
    return f'<b>Generated:</b> {dt.strftime("%d/%m/%Y, %H:%M:%S")} PKT'

# Display labels for the stored business categories (internal keys are unchanged).
_CATEGORY_LABEL = {'potential_lead': 'Client', 'internal_staff': 'Internal / Staff',
                   'unclassified': 'Unclassified'}

def generate_pdf(name: str, summary: dict) -> bytes:
    buf=io.BytesIO()
    doc=SimpleDocTemplate(buf,pagesize=(595,842),leftMargin=42,rightMargin=42,topMargin=48,bottomMargin=48)
    styles=getSampleStyleSheet()
    styles.add(ParagraphStyle(name='HeadingGreen',parent=styles['Heading1'],fontSize=18,leading=23,textColor=colors.HexColor('#117552'),spaceAfter=14))
    styles.add(ParagraphStyle(name='SmallTextCSR',parent=styles['BodyText'],fontSize=9.3,leading=14,spaceAfter=8))
    period=escape(str(summary.get('period_label') or f'Last {summary["hours"]} hours'))
    analyzed=summary.get('analyzed_messages')
    scope_line=f'<b>Counselor:</b> {escape(name)}  |  <b>Period:</b> {period}'
    if analyzed is not None:
        scope_line+=f'  |  <b>Eligible chats:</b> {summary.get("eligible_chats",summary["total_chats"])}  |  <b>Messages analyzed:</b> {analyzed}'
    story=[Paragraph('WhatsApp Lead Conversation Audit',styles['HeadingGreen']),Paragraph('CONFIDENTIAL - INTERNAL USE ONLY',styles['SmallTextCSR']),Paragraph(scope_line,styles['BodyText'])]
    gen_line=_generated_line(summary)
    if gen_line:story.append(Paragraph(gen_line,styles['BodyText']))
    story.append(Spacer(1,16))
    # Headline leads are DETERMINISTIC (rule-based potential_lead), independent of
    # AI, so this count always matches the Conversations section and never blanks
    # to 0 when AI is unavailable.
    data=[['Total Chats','Clients','Needs Review','Unread Excluded'],
          [str(summary['total_chats']),str(summary['potential_leads']),
           str(summary['needs_review']),str(summary['unread_excluded'])]]
    t=Table(data,colWidths=[120]*4)
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#ecf8f0')),('TEXTCOLOR',(0,0),(-1,0),colors.HexColor('#14532d')),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),10),('ALIGN',(0,0),(-1,-1),'CENTER'),('BOX',(0,0),(-1,-1),0.5,colors.HexColor('#ccddd5')),('INNERGRID',(0,0),(-1,-1),0.3,colors.HexColor('#ccddd5')),('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),9)]))
    audit=summary.get('audit_counts')
    breakdown=(f"{summary['total_chats']} synchronized conversations were within this reporting window. "
               f"{summary['potential_leads']} contain possible study-abroad or scholarship intent; "
               f"{summary['possible_internal']} appear internal; {summary['unclassified']} are unclassified; "
               f"{summary['needs_review']} need manual review. These are rule-based indicators, not confirmed sales outcomes.")
    if audit:
        breakdown+=(f" AI enrichment evaluated {summary.get('audit_evaluated',0)}/{summary['total_chats']} chats "
                    f"({summary.get('audit_unavailable',0)} unavailable); AI adds narrative/QA only and never changes these counts.")
    # The deterministic counts are a factual overview, NOT the Executive Summary.
    story += [t,Spacer(1,18),Paragraph('Report Overview',styles['Heading2']),
              Paragraph(escape(breakdown),styles['SmallTextCSR'])]
    # Executive Summary is AI-ONLY (contract 10.6): render the heading + body ONLY
    # when a valid AI summary exists; otherwise omit the entire section (no heading,
    # no placeholder, no deterministic substitute).
    if summary.get('executive_summary'):
        story.append(Paragraph('Executive Summary',styles['Heading2']))
        story.append(Paragraph(escape(summary['executive_summary']),styles['SmallTextCSR']))
    # Lead Pipeline is shown before Management Metrics. Four tiers only (no fifth
    # "Close to Conversion"); responsive leads with no qualification evidence are
    # Tier Pending, never scored by activity.
    _hdr=TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#edf6fb')),
                     ('TEXTCOLOR',(0,0),(-1,0),colors.HexColor('#254b6d')),
                     ('ALIGN',(0,0),(-1,-1),'CENTER'),('FONTSIZE',(0,0),(-1,-1),9),
                     ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
                     ('BOX',(0,0),(-1,-1),0.4,colors.HexColor('#ccdde9')),
                     ('INNERGRID',(0,0),(-1,-1),0.3,colors.HexColor('#ccdde9')),
                     ('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8)])
    story.append(Paragraph('Lead Pipeline - Responsive Leads Only',styles['Heading2']))
    tiers=summary.get('lead_tiers') or {}
    pending=summary.get('responsive_tier_pending',0)
    tier_rows=[['Very Hot','Hot','Average','Cold','Tier Pending'],
               [str(tiers.get(key,0)) for key in ('very_hot','hot','average','cold')]+[str(pending)]]
    tier_table=Table(tier_rows,colWidths=[96]*5);tier_table.setStyle(_hdr)
    tier_note=('Tiers apply to responsive leads only. An explicit CGPA uses the legacy bands '
               '(Very Hot 3.7+, Hot 3.1-3.69, Average 2.6-3.09, Cold below 2.6); the AI judge may '
               'tier from clear qualification evidence. A responsive lead without such evidence is '
               'Tier Pending Verification - never scored by activity. There is no fifth conversion tier.')
    story.extend([tier_table, Spacer(1,7),Paragraph(escape(tier_note),styles['SmallTextCSR'])])
    # Canonical conversation classes (contract 4.2) and the separate outcome/closure
    # dimension (contract 4.4). Shown only when present (legacy reports are unaffected).
    cc=summary.get('canonical_counts')
    if cc:
        story.append(Spacer(1,8));story.append(Paragraph('Lead Conversation Classification',styles['Heading2']))
        cc_rows=[['Responsive','Dead','Consultant No-Reply','Internal / Staff','Empty','Needs Review'],
                 [str(cc.get(k,0)) for k in ('responsive','dead','consultant_no_reply','internal_staff','empty','needs_review')]]
        cc_tab=Table(cc_rows,colWidths=[80]*6);cc_tab.setStyle(_hdr);story.extend([cc_tab,Spacer(1,6)])
    sc=summary.get('status_counts')
    if sc:
        story.append(Paragraph('Lead Outcome &amp; Closure (Responsive leads)',styles['Heading2']))
        sc_rows=[['Closed / Handed Over','Rejected','Stalled','Status Pending'],
                 [str(sc.get(k,0)) for k in ('closed','rejected','stalled','status_pending')]]
        sc_tab=Table(sc_rows,colWidths=[120]*4);sc_tab.setStyle(_hdr)
        story.extend([sc_tab,Spacer(1,5),
                      Paragraph('Status is independent of tier. Closed means an evidenced handover to a country '
                                'counselor (not a payment, admission or a promise to transfer).',styles['SmallTextCSR'])])
    # Management analytics (spec 18 Nov 2026) — deterministic, event-time metrics.
    # Shown only when the report carries these keys; legacy reports are unaffected.
    if summary.get('new_leads') is not None:
        def _dur(s):
            if s is None:return 'N/A'
            s=int(round(s));return (f'{s//60}m {s%60}s') if s>=60 else f'{s}s'
        story.append(Paragraph('Management Metrics',styles['Heading2']))
        mlabel=ParagraphStyle(name='MLabel',parent=styles['BodyText'],fontSize=8,leading=9.5,alignment=TA_CENTER,fontName='Helvetica-Bold')
        def _ml(txt):return Paragraph(txt,mlabel)
        mg=[[_ml('New Leads'),_ml('New Lead Responded'),_ml('NR From Lead'),_ml('NR From Conseller')],
            [str(summary.get('new_leads',0)),str(summary.get('new_lead_responded',0)),
             str(summary.get('nr_from_lead',0)),str(summary.get('nr_from_counsellor',0))],
            [_ml('Overall Follow-up'),_ml('Old Client Follow-up'),_ml('No Response on Old Follow up from consellers'),_ml('')],
            [str(summary.get('follow_up_conversations',0)),str(summary.get('old_client_follow_up',0)),
             str(summary.get('old_followup_awaiting',0)),'']]
        mt=Table(mg,colWidths=[120]*4)
        mt.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#ecf8f0')),('BACKGROUND',(0,2),(-1,2),colors.HexColor('#ecf8f0')),
                                ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTNAME',(0,2),(-1,2),'Helvetica-Bold'),
                                ('FONTSIZE',(0,0),(-1,-1),8.5),('ALIGN',(0,0),(-1,-1),'CENTER'),
                                ('BOX',(0,0),(-1,-1),0.5,colors.HexColor('#ccddd5')),('INNERGRID',(0,0),(-1,-1),0.3,colors.HexColor('#ccddd5')),
                                ('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
        story.extend([mt,Spacer(1,8)])
        story.append(Paragraph(f"<b>Avg new-lead first response:</b> {_dur(summary.get('avg_new_lead_first_response_seconds'))} "
                               f"(sample {summary.get('new_lead_first_response_samples',0)}, {summary.get('new_lead_first_response_missing',0)} missing). "
                               f"<b>Median overall response:</b> {_dur(summary.get('median_overall_response_seconds'))} (typical) "
                               f"&middot; avg {_dur(summary.get('avg_overall_response_seconds'))} &middot; p90 {_dur(summary.get('p90_overall_response_seconds'))} "
                               f"(sample {summary.get('overall_response_samples',0)}). Median is robust to overnight waits; missing/invalid pairs shown as N/A, never 0.",styles['SmallTextCSR']))
        # "Awaiting Counselor Reply" is shown as "NR From Conseller" in Management
        # Metrics above, so it is omitted from this reply-state breakdown to avoid
        # showing the same number twice.
        rs={k:v for k,v in (summary.get('reply_states') or {}).items() if k!='awaiting_counselor_reply'}
        story.append(Paragraph("<b>Reply state:</b> "+escape(', '.join(f"{k.replace('_',' ').title()}: {v}" for k,v in rs.items()) or 'None'),styles['SmallTextCSR']))
        story.append(Paragraph(f"<b>Responses by channel:</b> Text/Voice replied {summary.get('responded_text_voice',0)}; "
                               f"All-channel (incl. outbound call) {summary.get('responded_all_channel',0)}. "
                               f"Calls inbound {summary.get('calls_inbound',0)}, outbound {summary.get('calls_outbound',0)} "
                               f"(new-lead {summary.get('new_lead_calls',0)}, follow-up {summary.get('follow_up_calls',0)}). "
                               "Answered calls are not merged into the text/voice reply count.",styles['SmallTextCSR']))
        cl=summary.get('country_leads') or {}
        story.append(Paragraph('<b>Country Pipeline (Clients)</b>',styles['SmallTextCSR']))
        crows=[['Country','Leads']]+[[str(k),str(v)] for k,v in cl.items()]
        if not cl:crows.append(['No destination evidence','0'])
        crows.append(['Multi-country (counted once per country)',str(summary.get('multi_country_leads',0))])
        crows.append(['Unknown country',str(summary.get('unknown_country_leads',0))])
        ctab=Table(crows,colWidths=[360,110])
        ctab.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#ecf8f0')),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
            ('FONTSIZE',(0,0),(-1,-1),9),('ALIGN',(1,0),(1,-1),'CENTER'),('ALIGN',(0,0),(0,-1),'LEFT'),
            ('BOX',(0,0),(-1,-1),0.4,colors.HexColor('#ccddd5')),('INNERGRID',(0,0),(-1,-1),0.3,colors.HexColor('#ccddd5')),
            ('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5)]))
        story.extend([ctab,Spacer(1,5),Paragraph('Each multi-country lead is counted once per country here but once in the global total; country is never guessed.',styles['SmallTextCSR'])])
    story.append(Paragraph('Lead Register / Conversation Classification',styles['Heading2']))
    if summary['conversations']:
        _cell=ParagraphStyle(name='LRCell',parent=styles['BodyText'],fontSize=8,leading=10)
        _hcell=ParagraphStyle(name='LRHead',parent=styles['BodyText'],fontSize=8,leading=10,fontName='Helvetica-Bold')
        lr=[[Paragraph(h,_hcell) for h in ('Conversation','Category','Tier','Status','Msgs','Notes')]]
        for row in summary['conversations'][:120]:
            title=escape(str(row.get('title') or '')[:60])
            # Canonical conversation class (final, single source of truth).
            canon=str(row.get('canonical_category') or row.get('classification') or 'unclassified')
            kind=escape(canon.replace('_',' ').title())
            if row.get('lead_tier'):
                tier=escape(str(row['lead_tier']).replace('_',' ').title())
            elif row.get('tier_assessment')=='PENDING_REVIEW':
                tier='Pending Verification'
            else:
                tier='Not Assessed'
            status=escape(str(row.get('lead_status')).title()) if row.get('lead_status') else '-'
            reason=escape((row.get('status_reason') or row.get('audit_reason') or row.get('review_reason') or '')[:140]) or '-'
            lr.append([Paragraph(f'<b>{title}</b>',_cell),Paragraph(kind,_cell),Paragraph(tier,_cell),
                       Paragraph(status,_cell),str(row.get('messages',0)),Paragraph(reason,_cell)])
        lt=Table(lr,colWidths=[104,62,48,56,30,160])
        lt.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#ecf8f0')),('VALIGN',(0,0),(-1,-1),'TOP'),
            ('FONTSIZE',(0,0),(-1,-1),8),('ALIGN',(4,0),(4,-1),'CENTER'),
            ('BOX',(0,0),(-1,-1),0.4,colors.HexColor('#ccddd5')),('INNERGRID',(0,0),(-1,-1),0.3,colors.HexColor('#ccddd5')),
            ('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4)]))
        story.append(lt)
        if len(summary['conversations'])>120:
            story.append(Paragraph(f"Showing first 120 of {len(summary['conversations'])} conversations.",styles['SmallTextCSR']))
    else:story.append(Paragraph('No conversations found for this period.',styles['SmallTextCSR']))
    story.append(Spacer(1,10));story.append(Paragraph('Voice Notes & Call Data Coverage',styles['Heading2']))
    story.append(Paragraph(f"Voice notes received: {summary['voice_notes_received']}; sent: {summary['voice_notes_sent']}. Sum of recognized voice-note durations: {summary['known_voice_duration_seconds']} seconds (may be incomplete). Detected call events: {summary['call_placeholders']}. Actual call details are not inferred.",styles['SmallTextCSR']))
    story.append(Paragraph('Potential Reply Gaps (For Manual Verification)',styles['Heading2']))
    story.append(Paragraph(f"Possible unanswered lead conversations: {summary['possible_no_reply']}. Possible dead lead conversations: {summary['possible_dead']}. Sender attribution and message times must be verified before evaluating counselor performance.",styles['SmallTextCSR']))
    story.append(Paragraph('Quality Framework',styles['Heading2']))
    for k,v in summary['qa_dimensions'].items():story.append(Paragraph(f'<b>{escape(k.replace("_"," ").title())}:</b> {escape(v)}',styles['SmallTextCSR']))
    story.append(Paragraph('Data Quality & Management Actions',styles['Heading2']))
    for action in summary.get('top_actions',[]):story.append(Paragraph('• '+escape(action),styles['SmallTextCSR']))
    story.append(Paragraph('<b>Analysis mode:</b> '+escape(summary.get('ai_status','Rule-based baseline')),styles['SmallTextCSR']))
    for note in summary['quality_notes'] or ['No specific coverage issue reported in the available synchronized dataset.']:
        story.append(Paragraph('• '+escape(note),styles['SmallTextCSR']))
    if summary.get('audit_bottom_line'):
        story.append(Paragraph('Management Bottom Line',styles['Heading2']))
        story.append(Paragraph(escape(summary['audit_bottom_line']),styles['SmallTextCSR']))
    story.append(Paragraph('Management should validate lead identity, unavailable WhatsApp content, and missing response timestamps before relying on AI/heuristic performance conclusions.',styles['SmallTextCSR']))
    story.append(Paragraph(f'<b>Counts reconciled:</b> {"Yes" if summary["counts_reconciled"] else "No"}'
                           f' &middot; <b>Canonical classes:</b> {"Yes" if summary.get("canonical_reconciled",True) else "No"}'
                           f' &middot; <b>Responsive = tiers + pending:</b> {"Yes" if summary.get("responsive_reconciled",True) else "No"}',styles['SmallTextCSR']))
    if audit is not None:
        story.append(Paragraph(f'<b>AI audit categories reconciled:</b> {"Yes" if summary.get("audit_counts_reconciled") else "No"}',styles['SmallTextCSR']))
    doc.build(story)
    return buf.getvalue()

def generate_drill_pdf(name: str, label: str, period: str, generated_at: str | None,
                       columns: list[str], rows: list[list[str]]) -> bytes:
    """Styled PDF of one drill-down subset — the exact table the admin popup shows."""
    buf=io.BytesIO()
    doc=SimpleDocTemplate(buf,pagesize=(595,842),leftMargin=36,rightMargin=36,topMargin=44,bottomMargin=44)
    styles=getSampleStyleSheet()
    styles.add(ParagraphStyle(name='DrillHead',parent=styles['Heading1'],fontSize=16,leading=21,textColor=colors.HexColor('#117552'),spaceAfter=6))
    styles.add(ParagraphStyle(name='DrillSmall',parent=styles['BodyText'],fontSize=9,leading=13,spaceAfter=5))
    cnt=len(rows)
    story=[Paragraph('WhatsApp Lead Conversation Audit &mdash; Detail',styles['DrillHead']),
           Paragraph('CONFIDENTIAL - INTERNAL USE ONLY',styles['DrillSmall']),
           Paragraph(f'<b>{escape(label)}</b> &middot; {cnt} conversation{"" if cnt==1 else "s"}',styles['DrillSmall']),
           Paragraph(f'<b>Counselor:</b> {escape(name)}  |  <b>Period:</b> {escape(period)}',styles['DrillSmall'])]
    gen_line=_generated_line({'generated_at':generated_at})
    if gen_line:story.append(Paragraph(gen_line,styles['DrillSmall']))
    story.append(Spacer(1,10))
    cell=ParagraphStyle(name='DrillCell',parent=styles['BodyText'],fontSize=7.4,leading=9.6)
    hcell=ParagraphStyle(name='DrillCellHead',parent=styles['BodyText'],fontSize=7.6,leading=9.6,fontName='Helvetica-Bold',textColor=colors.HexColor('#15543f'))
    ncol=max(1,len(columns))
    data=[[Paragraph(escape(str(c)),hcell) for c in columns]]
    for r in rows:
        padded=list(r[:ncol])+['']*(ncol-len(r))
        data.append([Paragraph(escape(str(c)),cell) for c in padded])
    avail=523.0
    widths=[avail/ncol]*ncol
    table=Table(data,colWidths=widths,repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#ecf8f0')),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
        ('BOX',(0,0),(-1,-1),0.4,colors.HexColor('#cfe0d8')),
        ('INNERGRID',(0,0),(-1,-1),0.3,colors.HexColor('#dbe8e2')),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#f6fbf8')]),
        ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),
        ('LEFTPADDING',(0,0),(-1,-1),4),('RIGHTPADDING',(0,0),(-1,-1),4),
    ]))
    story.append(table)
    if not rows:
        story.append(Spacer(1,8))
        story.append(Paragraph('No conversations in this subset.',styles['DrillSmall']))
    doc.build(story)
    return buf.getvalue()
