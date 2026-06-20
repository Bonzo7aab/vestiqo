import React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { OfferSelectionProtocolData } from './fetch-offer-selection-protocol-data';
import { formatProtocolMoney } from './fetch-offer-selection-protocol-data';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#000000',
    lineHeight: 1.4,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 11,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginTop: 14,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 2,
  },
  paragraph: {
    marginBottom: 4,
  },
  table: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#000000',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#cccccc',
  },
  cellContractor: { width: '22%', padding: 4 },
  cellSmall: { width: '11%', padding: 4, textAlign: 'right' },
  cellMedium: { width: '12%', padding: 4, textAlign: 'right' },
  cellStatus: { width: '10%', padding: 4, textAlign: 'center' },
  headerText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  cellText: {
    fontSize: 8,
  },
  justification: {
    marginTop: 4,
    padding: 8,
    borderWidth: 0.5,
    borderColor: '#cccccc',
    minHeight: 48,
  },
  signature: {
    marginTop: 32,
    fontSize: 10,
  },
  signatureLine: {
    marginTop: 24,
    borderBottomWidth: 0.5,
    borderBottomColor: '#000000',
    width: 220,
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
        <Text style={styles.paragraph}>
          Data i miejsce sporządzenia protokołu: {data.awardedAt}, {data.propertyLabel}
        </Text>
        <Text style={styles.paragraph}>Nieruchomość: {data.propertyLabel}</Text>
        <Text style={styles.paragraph}>
          Osoba odpowiedzialna (Zarządca): {data.managerName}
          {data.managerCompanyName !== '—' ? ` (${data.managerCompanyName})` : ''}
        </Text>

        <Text style={styles.sectionTitle}>2. Tabela porównawcza</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.cellContractor}>
              <Text style={styles.headerText}>Wykonawca</Text>
            </View>
            <View style={styles.cellSmall}>
              <Text style={styles.headerText}>Netto</Text>
            </View>
            <View style={styles.cellSmall}>
              <Text style={styles.headerText}>VAT</Text>
            </View>
            <View style={styles.cellMedium}>
              <Text style={styles.headerText}>Brutto</Text>
            </View>
            <View style={styles.cellSmall}>
              <Text style={styles.headerText}>Start</Text>
            </View>
            <View style={styles.cellSmall}>
              <Text style={styles.headerText}>Czas</Text>
            </View>
            <View style={styles.cellSmall}>
              <Text style={styles.headerText}>Gwar.</Text>
            </View>
            <View style={styles.cellStatus}>
              <Text style={styles.headerText}>Status</Text>
            </View>
          </View>
          {data.offers.map((offer, index) => (
            <View key={`${offer.contractorCompany}-${index}`} style={styles.tableRow}>
              <View style={styles.cellContractor}>
                <Text style={styles.cellText}>{offer.contractorCompany}</Text>
              </View>
              <View style={styles.cellSmall}>
                <Text style={styles.cellText}>{formatProtocolMoney(offer.netPrice)}</Text>
              </View>
              <View style={styles.cellSmall}>
                <Text style={styles.cellText}>{offer.vatLabel}</Text>
              </View>
              <View style={styles.cellMedium}>
                <Text style={styles.cellText}>{formatProtocolMoney(offer.grossPrice)}</Text>
              </View>
              <View style={styles.cellSmall}>
                <Text style={styles.cellText}>{offer.startDate}</Text>
              </View>
              <View style={styles.cellSmall}>
                <Text style={styles.cellText}>{offer.durationLabel}</Text>
              </View>
              <View style={styles.cellSmall}>
                <Text style={styles.cellText}>{offer.warrantyLabel}</Text>
              </View>
              <View style={styles.cellStatus}>
                <Text style={styles.cellText}>{offer.statusLabel}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>3. Uzasadnienie wyboru</Text>
        <View style={styles.justification}>
          <Text>{data.selectionJustification}</Text>
        </View>

        <Text style={styles.sectionTitle}>4. Podpis</Text>
        <Text style={styles.signature}>Podpis Zarządcy</Text>
        <View style={styles.signatureLine} />
      </Page>
    </Document>
  );
}
