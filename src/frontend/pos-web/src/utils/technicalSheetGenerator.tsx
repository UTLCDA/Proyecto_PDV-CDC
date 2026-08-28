import React from 'react';
import { Producto } from '../types/tiposCatalogo';
import { generateBarcodeBase64 } from './barcodeGenerator';
import { loadOfficialLogoDataUrl } from '../components/export/formatters';

/**
 * Generador de Ficha Técnica PDF para Productos WPC Bajío.
 */
export async function downloadTechnicalDataSheet(product: Producto): Promise<void> {
  const renderer = await import('@react-pdf/renderer');
  const { Document, Page, Text, View, Image, StyleSheet, pdf } = renderer;

  const logoUrl = await loadOfficialLogoDataUrl();
  const barcodeText = product.barcode || product.sku || 'WPC-PDV';
  const barcodeBase64 = generateBarcodeBase64(barcodeText, { width: 300, height: 50 });

  const piecesPerBox = product.piecesPerBox || 1;
  const unitPrice = product.unitPrice || 0;
  const wholesalePrice = product.wholesalePrice > 0 ? product.wholesalePrice : unitPrice;
  const boxPrice = piecesPerBox * wholesalePrice;
  const pieceCoverage = product.coveragePerUnitSqM || 0;
  const boxCoverage = product.boxCoverageSqM ? product.boxCoverageSqM : (piecesPerBox * pieceCoverage);

  const styles = StyleSheet.create({
    page: {
      padding: 30,
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: '#1E293B',
      backgroundColor: '#FFFFFF'
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: '#0284C7',
      paddingBottom: 12,
      marginBottom: 16
    },
    logo: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginRight: 12
    },
    headerText: {
      flex: 1
    },
    brandTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#0284C7'
    },
    docTitle: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#0F172A',
      marginTop: 2
    },
    subtitle: {
      fontSize: 8,
      color: '#64748B',
      marginTop: 1
    },
    dateBadge: {
      fontSize: 7.5,
      color: '#64748B',
      textAlign: 'right'
    },
    productTitleBox: {
      backgroundColor: '#F0F9FF',
      borderWidth: 1,
      borderColor: '#BAE6FD',
      borderRadius: 6,
      padding: 10,
      marginBottom: 14
    },
    productName: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#0369A1'
    },
    categoryText: {
      fontSize: 9,
      color: '#475569',
      marginTop: 2
    },
    section: {
      marginBottom: 14
    },
    sectionTitle: {
      fontSize: 10,
      fontWeight: 'bold',
      color: '#0284C7',
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
      paddingBottom: 4,
      marginBottom: 8
    },
    grid2: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8
    },
    infoCard: {
      width: '48%',
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: 4,
      padding: 6,
      marginBottom: 6
    },
    label: {
      fontSize: 7.5,
      color: '#64748B',
      fontWeight: 'bold',
      marginBottom: 1
    },
    value: {
      fontSize: 9.5,
      color: '#0F172A',
      fontWeight: 'bold'
    },
    priceRuleCard: {
      backgroundColor: '#FEF3C7',
      borderWidth: 1,
      borderColor: '#FDE68A',
      borderRadius: 6,
      padding: 10,
      marginTop: 8,
      marginBottom: 14
    },
    ruleTitle: {
      fontSize: 9.5,
      fontWeight: 'bold',
      color: '#92400E',
      marginBottom: 4
    },
    ruleText: {
      fontSize: 8.5,
      color: '#78350F',
      lineHeight: 1.3
    },
    pricingGrid: {
      flexDirection: 'row',
      justify: 'space-between',
      gap: 8,
      marginBottom: 8
    },
    priceBox: {
      flex: 1,
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: 5,
      padding: 8,
      alignItems: 'center'
    },
    priceBoxHighlight: {
      flex: 1,
      backgroundColor: '#ECFDF5',
      borderWidth: 1,
      borderColor: '#A7F3D0',
      borderRadius: 5,
      padding: 8,
      alignItems: 'center'
    },
    priceLabel: {
      fontSize: 7.5,
      color: '#475569',
      fontWeight: 'bold',
      marginBottom: 2
    },
    priceValue: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#059669'
    },
    priceValueRegular: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#D97706'
    },
    barcodeContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 10,
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: 6,
      marginTop: 6
    },
    barcodeImage: {
      height: 45,
      width: 220,
      objectFit: 'contain'
    },
    footer: {
      position: 'absolute',
      bottom: 20,
      left: 30,
      right: 30,
      borderTopWidth: 1,
      borderTopColor: '#E2E8F0',
      paddingTop: 6,
      flexDirection: 'row',
      justifyContent: 'space-between',
      fontSize: 7.5,
      color: '#94A3B8'
    }
  });

  const skuFormatted = product.sku ? product.sku.replace(/\s+/g, '-') : 'N/A';
  const emissionDate = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const ruleTextMayoreo = `• Si el cliente adquiere las piezas contenidas en una CAJA COMPLETA (${piecesPerBox} piezas) o más, aplica PRECIO MAYOREO ($${wholesalePrice.toFixed(2)} MXN / pieza = $${boxPrice.toFixed(2)} MXN por caja).`;
  const ruleTextMenudeo = `• Si el cliente adquiere una cantidad MENOR a las piezas contenidas en una caja (${piecesPerBox} piezas), aplica PRECIO MENUDEO ($${unitPrice.toFixed(2)} MXN / pieza).`;

  const doc = (
    <Document title={`Ficha Técnica - ${product.sku}`} author="WPC Bajío">
      <Page size="A4" style={styles.page}>
        {/* Encabezado */}
        <View style={styles.header}>
          {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}
          <View style={styles.headerText}>
            <Text style={styles.brandTitle}>WPC BAJÍO</Text>
            <Text style={styles.docTitle}>FICHA TÉCNICA DE PRODUCTO</Text>
            <Text style={styles.subtitle}>Lambrín Decorativo y Acabados de Alta Calidad</Text>
          </View>
          <View style={styles.dateBadge}>
            <Text>Fecha de Emisión:</Text>
            <Text style={{ fontWeight: 'bold', color: '#0F172A', marginTop: 1 }}>{emissionDate}</Text>
          </View>
        </View>

        {/* Título de Producto */}
        <View style={styles.productTitleBox}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.categoryText}>Categoría: {product.categoryName || 'General'}</Text>
        </View>

        {/* Información General & SKU / Color */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📌 Información General del Producto</Text>
          <View style={styles.grid2}>
            <View style={styles.infoCard}>
              <Text style={styles.label}>SKU / CLAVE</Text>
              <Text style={styles.value}>{skuFormatted}</Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.label}>COLOR / ACABADO</Text>
              <Text style={[styles.value, { color: '#0284C7' }]}>{product.color || 'No especificado'}</Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.label}>CÓDIGO DE BARRAS</Text>
              <Text style={styles.value}>{product.barcode || '—'}</Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.label}>UNIDAD DE MEDIDA</Text>
              <Text style={styles.value}>{product.unitOfMeasure || 'Pieza'}</Text>
            </View>
          </View>
        </View>

        {/* Especificaciones Técnicas & Coberturas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📐 Especificaciones Técnicas y Coberturas</Text>
          <View style={styles.grid2}>
            <View style={styles.infoCard}>
              <Text style={styles.label}>MATERIAL</Text>
              <Text style={styles.value}>{product.material || 'WPC (Wood Plastic Composite)'}</Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.label}>PIEZAS POR CAJA</Text>
              <Text style={styles.value}>{piecesPerBox} piezas</Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.label}>COBERTURA POR PIEZA</Text>
              <Text style={styles.value}>{pieceCoverage} m²</Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.label}>COBERTURA TOTAL POR CAJA</Text>
              <Text style={styles.value}>{boxCoverage.toFixed(2)} m²</Text>
            </View>

            <View style={[styles.infoCard, { width: '100%' }]}>
              <Text style={styles.label}>DIMENSIONES (Largo x Ancho x Alto)</Text>
              <Text style={styles.value}>
                {`${product.lengthCm || 0} cm (L) x ${product.widthCm || 0} cm (A) x ${product.heightCm || 0} cm (H)`}
              </Text>
            </View>

            {product.description ? (
              <View style={[styles.infoCard, { width: '100%' }]}>
                <Text style={styles.label}>DESCRIPCIÓN TÉCNICA Y ACABADOS</Text>
                <Text style={{ fontSize: 8.5, color: '#334155', marginTop: 2 }}>{product.description}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Desglose Estructurado de Precios & Regla Comercial */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💵 Estructura de Precios y Esquema de Venta</Text>

          <View style={styles.pricingGrid}>
            <View style={styles.priceBox}>
              <Text style={styles.priceLabel}>PRECIO MENUDEO (POR PIEZA)</Text>
              <Text style={styles.priceValueRegular}>{`$${unitPrice.toFixed(2)} MXN`}</Text>
              <Text style={{ fontSize: 7, color: '#64748B', marginTop: 2 }}>Venta individual (piezas menores a caja)</Text>
            </View>

            <View style={styles.priceBoxHighlight}>
              <Text style={styles.priceLabel}>PRECIO MAYOREO (POR PIEZA)</Text>
              <Text style={styles.priceValue}>{`$${wholesalePrice.toFixed(2)} MXN`}</Text>
              <Text style={{ fontSize: 7, color: '#047857', marginTop: 2 }}>En compra por caja o volumen</Text>
            </View>

            <View style={styles.priceBoxHighlight}>
              <Text style={styles.priceLabel}>{`PRECIO CAJA COMPLETA (${piecesPerBox} Pzas)`}</Text>
              <Text style={styles.priceValue}>{`$${boxPrice.toFixed(2)} MXN`}</Text>
              <Text style={{ fontSize: 7, color: '#047857', marginTop: 2 }}>{`Caja cerrada (${boxCoverage.toFixed(2)} m²)`}</Text>
            </View>
          </View>

          {/* Tarjeta Informativa con la Regla del Negocio Solicitada */}
          <View style={styles.priceRuleCard}>
            <Text style={styles.ruleTitle}>📌 REGLA COMERCIAL DE APLICACIÓN DE PRECIOS:</Text>
            <Text style={styles.ruleText}>{ruleTextMayoreo}</Text>
            <Text style={[styles.ruleText, { marginTop: 2 }]}>{ruleTextMenudeo}</Text>
          </View>
        </View>

        {/* Representación Visual del Código de Barras */}
        {barcodeBase64 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Código de Barras de Producto</Text>
            <View style={styles.barcodeContainer}>
              <Image src={barcodeBase64} style={styles.barcodeImage} />
            </View>
          </View>
        ) : null}

        {/* Pie de Página */}
        <View style={styles.footer}>
          <Text>WPC Bajío — Documento Oficial de Especificaciones Técnicas y Precios</Text>
          <Text>www.wpcbajio.com</Text>
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(doc).toBlob();
  const fileName = `Ficha_Tecnica_${(product.sku || 'PROD').replace(/[\s/]/g, '-')}.pdf`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
