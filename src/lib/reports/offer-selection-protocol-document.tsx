import React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { OfferSelectionProtocolData } from './fetch-offer-selection-protocol-data';
import { formatProtocolMoney } from './fetch-offer-selection-protocol-data';
import { PDF_FONT_FAMILY } from './pdf-fonts';

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 10,
    color: '#111111',
    lineHeight: 1.45,
  },
  title: {
    fontSize: 15,
    fontFamily: PDF_FONT_FAMILY,
    fontWeight: 'bold',
    marginBottom: 20,
    lineHeight: 1.35,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: PDF_FONT_FAMILY,
    fontWeight: 'bold',
    marginTop: 18,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  summaryBlock: {
    marginBottom: 4,
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  summaryLabel: {
    width: 148,
    fontFamily: PDF_FONT_FAMILY,
    fontWeight: 'bold',
    paddingRight: 8,
  },
  summaryValue: {
    flex: 1,
  },
  table: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#333333',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#d1d5db',
    minHeight: 22,
    alignItems: 'center',
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableRowWinner: {
    backgroundColor: '#f0fdf4',
  },
  cellContractor: { width: '24%', paddingVertical: 5, paddingHorizontal: 5 },
  cellMoney: { width: '11%', paddingVertical: 5, paddingHorizontal: 4, textAlign: 'right' },
  cellDate: { width: '12%', paddingVertical: 5, paddingHorizontal: 4, textAlign: 'center' },
  cellShort: { width: '9%', paddingVertical: 5, paddingHorizontal: 4, textAlign: 'center' },
  cellStatus: { width: '13%', paddingVertical: 5, paddingHorizontal: 4, textAlign: 'center' },
  headerText: {
    fontFamily: PDF_FONT_FAMILY,
    fontWeight: 'bold',
    fontSize: 8,
  },
  cellText: {
    fontSize: 8,
    lineHeight: 1.3,
  },
  cellTextBold: {
    fontSize: 8,
    fontFamily: PDF_FONT_FAMILY,
    fontWeight: 'bold',
    lineHeight: 1.3,
  },
  justification: {
    marginTop: 2,
    padding: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 2,
    minHeight: 56,
    backgroundColor: '#fafafa',
  },
  justificationText: {
    fontSize: 10,
    lineHeight: 1.5,
  },
  signatureBlock: {
    marginTop: 36,
  },
  signatureLabel: {
    fontSize: 10,
    marginBottom: 28,
  },
  signatureLine: {
    borderBottomWidth: 0.75,
    borderBottomColor: '#111111',
    width: 240,
  },
});

interface OfferSelectionProtocolDocumentProps {
  data: OfferSelectionProtocolData;
}

export function OfferSelectionProtocolDocument({
  data,
}: OfferSelectionProtocolDocumentProps): React.ReactElement {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>
          Protokół z otwarcia i wyboru ofert w konkursie: {data.contestTitle}
        </Text>

        <Text style={styles.sectionTitle}>1. Podsumowanie</Text>
        <View style={styles.summaryBlock}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Data sporządzenia</Text>
            <Text style={styles.summaryValue}>{data.awardedAt}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Nieruchomość</Text>
            <Text style={styles.summaryValue}>{data.propertyLabel}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Osoba odpowiedzialna</Text>
            <Text style={styles.summaryValue}>
              {data.managerName}
              {data.managerCompanyName !== '—' ? ` (${data.managerCompanyName})` : ''}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>2. Tabela porównawcza</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.cellContractor}>
              <Text style={styles.headerText}>Wykonawca</Text>
            </View>
            <View style={styles.cellMoney}>
              <Text style={styles.headerText}>Netto</Text>
            </View>
            <View style={styles.cellShort}>
              <Text style={styles.headerText}>VAT</Text>
            </View>
            <View style={styles.cellMoney}>
              <Text style={styles.headerText}>Brutto</Text>
            </View>
            <View style={styles.cellDate}>
              <Text style={styles.headerText}>Start</Text>
            </View>
            <View style={styles.cellShort}>
              <Text style={styles.headerText}>Czas</Text>
            </View>
            <View style={styles.cellShort}>
              <Text style={styles.headerText}>Gwar.</Text>
            </View>
            <View style={styles.cellStatus}>
              <Text style={styles.headerText}>Status</Text>
            </View>
          </View>
          {data.offers.map((offer, index) => {
            const isWinner = offer.statusLabel === 'Wybrana';
            const isLast = index === data.offers.length - 1;
            return (
              <View
                key={`${offer.contractorCompany}-${index}`}
                style={[
                  styles.tableRow,
                  isWinner ? styles.tableRowWinner : undefined,
                  isLast ? styles.tableRowLast : undefined,
                ]}
              >
                <View style={styles.cellContractor}>
                  <Text style={isWinner ? styles.cellTextBold : styles.cellText} wrap>
                    {offer.contractorCompany}
                  </Text>
                </View>
                <View style={styles.cellMoney}>
                  <Text style={styles.cellText}>{formatProtocolMoney(offer.netPrice)}</Text>
                </View>
                <View style={styles.cellShort}>
                  <Text style={styles.cellText}>{offer.vatLabel}</Text>
                </View>
                <View style={styles.cellMoney}>
                  <Text style={styles.cellText}>{formatProtocolMoney(offer.grossPrice)}</Text>
                </View>
                <View style={styles.cellDate}>
                  <Text style={styles.cellText}>{offer.startDate}</Text>
                </View>
                <View style={styles.cellShort}>
                  <Text style={styles.cellText} wrap>
                    {offer.durationLabel}
                  </Text>
                </View>
                <View style={styles.cellShort}>
                  <Text style={styles.cellText}>{offer.warrantyLabel}</Text>
                </View>
                <View style={styles.cellStatus}>
                  <Text style={isWinner ? styles.cellTextBold : styles.cellText}>
                    {offer.statusLabel}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>3. Uzasadnienie wyboru</Text>
        <View style={styles.justification}>
          <Text style={styles.justificationText}>{data.selectionJustification}</Text>
        </View>

        <Text style={styles.sectionTitle}>4. Podpis</Text>
        <View style={styles.signatureBlock}>
          <Text style={styles.signatureLabel}>Podpis Zarządcy</Text>
          <View style={styles.signatureLine} />
        </View>
      </Page>
    </Document>
  );
}
