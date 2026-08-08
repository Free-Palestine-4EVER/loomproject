// InvoiceDetailView.swift — the invoice detail: month, status, issued date,
// every line (label, qty, unit price, line total) and the grand total. Per
// contract, the 100-conversation floor line must read as an understandable
// charge: every line shows its qty × unit price math via explicit columns
// (not a single opaque total), and any line that lands exactly on the
// SPEC.md `CONVERSATION_MINIMUM` (100) additionally gets a plain-language
// note explaining it is LOOM's minimum, not an extra charge.
import SwiftUI

struct InvoiceDetailView: View {
    let invoice: Invoice
    @Environment(LanguageManager.self) private var languageManager

    private var language: Language { languageManager.language }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: LoomSpacing.lg) {
                header
                lineItemsSection
                if hasFloorLine {
                    floorNote
                }
                totalSection
            }
            .padding(LoomSpacing.md)
        }
        .loomBackdrop()
        .navigationTitle(monthTitle)
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: Header

    private var monthTitle: String {
        InvoicesMonthFormatting.display(invoice.month, language: language)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: LoomSpacing.sm) {
            Text(monthTitle)
                .font(LoomFont.display(monthTitle, size: 28, weight: .bold))
                .foregroundStyle(LoomColor.ink)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: LoomSpacing.sm) {
                StatusChip(Text(invoice.status.localizedText(language: language)), tint: invoice.status.tint)
                Text(issuedLine)
                    .font(LoomFont.body(size: 13))
                    .foregroundStyle(LoomColor.inkDim)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var issuedLine: String {
        L10n.Invoices.issuedLabel.string(for: language) + " " + LoomNumber.date(invoice.issuedAt, language: language)
    }

    // MARK: Line items

    private var lineItemsSection: some View {
        LoomCard {
            VStack(alignment: .leading, spacing: LoomSpacing.sm) {
                SectionKicker(Text(L10n.Invoices.lineItemsTitle.string(for: language)))
                columnHeader
                Divider().overlay(LoomColor.line)
                VStack(spacing: LoomSpacing.xs) {
                    ForEach(Array(invoice.lines.enumerated()), id: \.offset) { _, line in
                        lineRow(line)
                    }
                }
            }
        }
    }

    private var columnHeader: some View {
        HStack(alignment: .firstTextBaseline, spacing: LoomSpacing.sm) {
            Text(L10n.Invoices.columnItem.string(for: language))
                .frame(maxWidth: .infinity, alignment: .leading)
            Text(L10n.Invoices.columnQty.string(for: language))
                .frame(minWidth: 32, alignment: .trailing)
            Text(L10n.Invoices.columnUnit.string(for: language))
                .frame(minWidth: 60, alignment: .trailing)
            Text(L10n.Invoices.columnLineTotal.string(for: language))
                .frame(minWidth: 60, alignment: .trailing)
        }
        .font(LoomFont.body(size: 11, weight: .semibold))
        .foregroundStyle(LoomColor.inkFaint)
        .textCase(.uppercase)
    }

    private func lineRow(_ line: Invoice.Line) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: LoomSpacing.sm) {
            VStack(alignment: .leading, spacing: 2) {
                Text(line.label)
                    .font(LoomFont.body(size: 14))
                    .foregroundStyle(LoomColor.ink)
                    .fixedSize(horizontal: false, vertical: true)
                if isFloorLine(line) {
                    Text(L10n.Invoices.floorNoteTitle.string(for: language))
                        .font(LoomFont.body(size: 10, weight: .semibold))
                        .foregroundStyle(LoomColor.gold)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            Text(InvoicesQuantityFormatting.string(line.qty, language: language))
                .frame(minWidth: 32, alignment: .trailing)
            Text(LoomNumber.currency(line.unitJod, language: language))
                .frame(minWidth: 60, alignment: .trailing)
                .fixedSize(horizontal: false, vertical: true)
                .multilineTextAlignment(.trailing)
            Text(LoomNumber.currency(line.totalJod, language: language))
                .frame(minWidth: 60, alignment: .trailing)
                .fixedSize(horizontal: false, vertical: true)
                .multilineTextAlignment(.trailing)
        }
        .font(LoomFont.body(size: 13))
        .foregroundStyle(LoomColor.inkDim)
        .padding(.vertical, LoomSpacing.xxs)
        .accessibilityElement(children: .combine)
    }

    // MARK: Floor note

    private var hasFloorLine: Bool {
        invoice.lines.contains(where: isFloorLine)
    }

    /// SPEC.md: `CONVERSATION_MINIMUM = 100` per client per month. A line
    /// whose `qty` lands on exactly that count is the billed floor, not a
    /// coincidence — tolerance guards only against floating-point noise.
    private func isFloorLine(_ line: Invoice.Line) -> Bool {
        abs(line.qty - 100) < 0.001
    }

    private var floorNote: some View {
        HStack(alignment: .top, spacing: LoomSpacing.sm) {
            Image(systemName: "info.circle")
                .foregroundStyle(LoomColor.gold)
            VStack(alignment: .leading, spacing: LoomSpacing.xxs) {
                Text(L10n.Invoices.floorNoteTitle.string(for: language))
                    .font(LoomFont.body(size: 13, weight: .semibold))
                    .foregroundStyle(LoomColor.ink)
                Text(L10n.Invoices.floorNoteMessage.string(for: language))
                    .font(LoomFont.body(size: 13))
                    .foregroundStyle(LoomColor.inkDim)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(LoomSpacing.md)
        .background(LoomColor.gold.opacity(0.08))
        .overlay(
            RoundedRectangle(cornerRadius: LoomRadius.standard, style: .continuous)
                .strokeBorder(LoomColor.gold.opacity(0.3), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: LoomRadius.standard, style: .continuous))
        .accessibilityElement(children: .combine)
    }

    // MARK: Total

    private var totalSection: some View {
        LoomCard(fill: LoomColor.bg3, glow: LoomColor.magenta) {
            HStack {
                Text(L10n.Invoices.totalLabel.string(for: language))
                    .font(LoomFont.body(size: 15, weight: .semibold))
                    .foregroundStyle(LoomColor.inkDim)
                Spacer()
                Text(totalText)
                    .font(LoomFont.display(totalText, size: 24, weight: .bold))
                    .foregroundStyle(LoomColor.ink)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private var totalText: String {
        LoomNumber.currency(invoice.totalJod, language: language)
    }
}
