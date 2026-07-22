import { getBasePlate, parseCustomerString } from '@/lib/utils';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles } from '../help';

const cleanDriverName = (name) => (name ? name.replace(/^'[^']+'\s*/, '') : '');

const formatIndoDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const getShortMonth = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('id-ID', { month: 'long' });
};

const calculateItemWeight = (item) => {
  const soString = parseCustomerString(item.visitName).invoiceNumber || '';
  const soCount = soString ? soString.split(',').length : 0;
  return Math.max(1, Math.ceil(soCount / 4));
};

const chunkArrayWeighted = (data, maxTotalWeight = 15) => {
  const chunks = [];
  let currentChunk = [];
  let currentPageWeight = 0;

  data.forEach((item) => {
    const itemWeight = calculateItemWeight(item);
    if (currentPageWeight + itemWeight > maxTotalWeight && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentPageWeight = 0;
    }
    currentChunk.push(item);
    currentPageWeight += itemWeight;
  });

  if (currentChunk.length > 0) chunks.push(currentChunk);
  return chunks.length > 0 ? chunks : [[]];
};

const DeliveryForm = ({ data, selectedDate, driverNameOverride, jamBerangkat, jamKembali }) => {
  const driverName = cleanDriverName(driverNameOverride || data?.vehicleName || '');
  const vehiclePlate = getBasePlate(data?.vehicleName || '');

  const validTrips = (data?.trips || []).filter((trip) => {
    if (trip.isHub) return false;
    const weight = parseFloat(trip.weight);
    const volume = parseFloat(trip.volume);
    return !((!isNaN(weight) && weight < 0) || (!isNaN(volume) && volume < 0));
  });

  const dataChunks = chunkArrayWeighted(validTrips, 15);

  const legendsLeft = [
    { label: 'Qty', desc: 'Total barang terkirim sesuai faktur.' },
    { label: 'Parkir', desc: 'Biaya parkir outlet.' },
    { label: 'Tol', desc: 'Biaya tol perjalanan.' },
    {
      label: 'K. Aman / Rupa-Rupa',
      desc: 'Biaya tambahan (pak ogah), sesuai kebijakan & konfirmasi.',
    },
  ];

  const legendsRight = [
    { label: 'D. Helper', desc: 'Biaya kirim via helper (kondisional).' },
    { label: 'KL. Luar', desc: 'Biaya TKBM luar, wajib konfirmasi.' },
    { label: 'Bon', desc: 'Kasbon sebelumnya.' },
    { label: 'Dibayar/Dikembalikan', desc: 'Pengeluaran - bon.' },
  ];

  const renderLegendItem = (item, idx) => (
    <View key={idx} style={styles.legendItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={styles.legendTextContent}>
        <Text style={{ fontWeight: 'bold' }}>{item.label}: </Text>
        {item.desc}
      </Text>
    </View>
  );

  const renderEmptyBiayaCells = () => (
    <View style={[styles.cell, styles.colBiayaParent, { flexDirection: 'row', padding: 0 }]}>
      {Array.from({ length: 5 }).map((_, idx) => (
        <View key={idx} style={[styles.nestedSubCell, { borderRightWidth: 1 }]} />
      ))}
      <View style={[styles.nestedSubCell, styles.nestedSubCellLast]} />
    </View>
  );

  const renderEmptyKetCells = () => (
    <View style={[styles.cell, styles.colKetParent, { flexDirection: 'row', padding: 0 }]}>
      <View style={[styles.nestedSubCell, { borderRightWidth: 1 }]} />
      <View style={[styles.nestedSubCell, styles.nestedSubCellLast]} />
    </View>
  );

  return (
    <Document>
      {dataChunks.map((chunk, pageIndex) => (
        <Page key={pageIndex} size="A4" orientation="landscape" style={styles.page}>
          <View style={styles.headerContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.mainTitle}>
                BUKTI TANDA TERIMA FAKTUR DAN PERINCIAN BIAYA DELIVERY TANGGAL :{' '}
                {formatIndoDate(selectedDate)}
              </Text>
            </View>

            <View style={styles.formSection}>
              <View style={styles.inputsContainer}>
                <View style={styles.inputRow}>
                  <Text style={styles.labelCol1}>DRIVER :</Text>
                  <View style={styles.lineCol1}>
                    <Text style={styles.inputText}>{driverName}</Text>
                  </View>
                  <View style={styles.spacer} />
                  <Text style={styles.labelCol2}>Jam Berangkat :</Text>
                  <View style={styles.lineCol2}>
                    <Text style={styles.inputText}>
                      {jamBerangkat === '-' ? '' : jamBerangkat || ''}
                    </Text>
                  </View>
                  <View style={styles.spacer} />
                  <Text style={styles.labelCol3}>No. Polisi Kendaraan :</Text>
                  <View style={styles.lineCol3}>
                    <Text style={styles.inputText}>{vehiclePlate}</Text>
                  </View>
                </View>
                <View style={styles.inputRow}>
                  <Text style={styles.labelCol1}>HELPER :</Text>
                  <View style={styles.lineCol1}>
                    <Text style={styles.inputText}></Text>
                  </View>
                  <View style={styles.spacer} />
                  <Text style={styles.labelCol2}>Jam Kembali :</Text>
                  <View style={styles.lineCol2}>
                    <Text style={styles.inputText}>
                      {jamKembali === '-' ? '' : jamKembali || ''}
                    </Text>
                  </View>
                  <View style={{ width: 15 }} />
                  <View style={{ flex: 1 }} />
                </View>
              </View>

              <View style={styles.miniTable}>
                <View style={styles.miniTableHeader}>
                  <View style={[styles.miniCell, styles.colBln, styles.miniTableFont]}>
                    <Text>BULAN</Text>
                  </View>
                  <View style={[styles.miniCell, styles.colNamaDriver, styles.miniTableFont]}>
                    <Text>NAMA DRIVER</Text>
                  </View>
                </View>
                <View style={styles.miniTableRow}>
                  <View style={[styles.miniCell, styles.colBln]}>
                    <Text>{getShortMonth(selectedDate)}</Text>
                  </View>
                  <View style={[styles.miniCell, styles.colNamaDriver]}>
                    <Text>{driverName}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.tableContainer}>
            <View style={[styles.tableRow, styles.tableHeaderRow]}>
              <View style={[styles.cell, styles.headerCell, styles.colFaktur]}>
                <Text>NOMOR FAKTUR</Text>
              </View>
              <View style={[styles.cell, styles.headerCell, styles.colOutlet]}>
                <Text>NAMA LANGGANAN</Text>
              </View>
              <View style={[styles.cell, styles.headerCell, styles.colQty]}>
                <Text>QTY</Text>
              </View>
              <View style={[styles.cell, styles.headerCell, styles.colBiayaParent]}>
                <Text style={styles.nestedHeaderTop}>BIAYA</Text>
                <View style={styles.nestedSubContainer}>
                  <Text style={styles.nestedSubCell}>PARKIR</Text>
                  <Text style={styles.nestedSubCell}>TOL</Text>
                  <Text style={styles.nestedSubCell}>KL. LUAR</Text>
                  <Text style={styles.nestedSubCell}>K. AMAN</Text>
                  <Text style={styles.nestedSubCell}>D. HELPER</Text>
                  <Text style={[styles.nestedSubCell, styles.nestedSubCellLast]}>RUPA-RUPA</Text>
                </View>
              </View>
              <View style={[styles.cell, styles.headerCell, styles.colJml]}>
                <Text>JUMLAH</Text>
              </View>
              <View style={[styles.cell, styles.headerCell, styles.colKetParent]}>
                <Text style={styles.nestedHeaderTop}>KETERANGAN</Text>
                <View style={styles.nestedSubContainer}>
                  <Text style={styles.nestedSubCell}>INSENTIF CARTON</Text>
                  <Text style={[styles.nestedSubCell, styles.nestedSubCellLast]}>
                    INSENTIF ROUTE
                  </Text>
                </View>
              </View>
            </View>

            {chunk.map((trip, idx) => {
              const { name: outletDisplay, invoiceNumber } = parseCustomerString(trip.visitName);
              return (
                <View key={idx} style={styles.tableRow} wrap={false}>
                  <View style={[styles.cell, styles.colFaktur]}>
                    <Text style={{ fontSize: 7 }}>{invoiceNumber || ''}</Text>
                  </View>
                  <View style={[styles.cell, styles.colOutlet]}>
                    <Text>{outletDisplay}</Text>
                  </View>
                  <View style={[styles.cell, styles.colQty]} />
                  {renderEmptyBiayaCells()}
                  <View style={[styles.cell, styles.colJml]} />
                  {renderEmptyKetCells()}
                </View>
              );
            })}

            {Array.from({
              length: Math.max(0, 15 - chunk.reduce((acc, i) => acc + calculateItemWeight(i), 0)),
            }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.tableRow}>
                <View style={[styles.cell, styles.colFaktur]} />
                <View style={[styles.cell, styles.colOutlet]} />
                <View style={[styles.cell, styles.colQty]} />
                {renderEmptyBiayaCells()}
                <View style={[styles.cell, styles.colJml]} />
                {renderEmptyKetCells()}
              </View>
            ))}

            <View style={[styles.tableRow, { minHeight: 15 }]}>
              <View
                style={[styles.cell, { width: '38%', paddingLeft: 5, justifyContent: 'center' }]}
              >
                <Text style={{ fontWeight: 'bold', fontSize: 8 }}>JUMLAH</Text>
              </View>
              {renderEmptyBiayaCells()}
              <View style={[styles.cell, styles.colJml]} />
              {renderEmptyKetCells()}
            </View>

            <View style={[styles.tableRow, { borderBottomWidth: 1, minHeight: 15 }]}>
              <View
                style={[
                  styles.cell,
                  styles.footerLabelCell,
                  {
                    width: '75%',
                    borderRightWidth: 1,
                    justifyContent: 'flex-start',
                    paddingLeft: 5,
                  },
                ]}
              >
                <Text>BON SEMENTARA</Text>
              </View>
              <View style={[styles.cell, styles.colJml]} />
              {renderEmptyKetCells()}
            </View>

            <View style={[styles.tableRow, { borderBottomWidth: 1, minHeight: 15 }]}>
              <View
                style={[
                  styles.cell,
                  styles.footerLabelCell,
                  {
                    width: '75%',
                    borderRightWidth: 1,
                    justifyContent: 'flex-start',
                    paddingLeft: 5,
                  },
                ]}
              >
                <Text>DIKEMBALIKAN/DIBAYAR</Text>
              </View>
              <View style={[styles.cell, styles.colJml]} />
              {renderEmptyKetCells()}
            </View>
          </View>

          <View style={styles.infoBox}>
            <View style={styles.infoTextColumn}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={[styles.infoText, { width: 25 }]}>Asli</Text>
                <Text style={[styles.infoText, { width: 20 }]}>Wr.</Text>
                <Text style={[styles.infoText, { width: 40 }]}>Putih</Text>
                <Text style={[styles.infoText, { width: 20 }]}>Utk</Text>
                <Text style={styles.infoText}>Delivery Claim Biaya</Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <Text style={[styles.infoText, { width: 25 }]}>Copy</Text>
                <Text style={[styles.infoText, { width: 20 }]}>Wr.</Text>
                <Text style={[styles.infoText, { width: 40 }]}>Kuning</Text>
                <Text style={[styles.infoText, { width: 20 }]}>Utk</Text>
                <Text style={styles.infoText}>Kep. Gudang</Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <Text style={[styles.infoText, { width: 25 }]}>Copy</Text>
                <Text style={[styles.infoText, { width: 20 }]}>Wr.</Text>
                <Text style={[styles.infoText, { width: 40 }]}>Merah</Text>
                <Text style={[styles.infoText, { width: 20 }]}>Utk</Text>
                <Text style={styles.infoText}>Insentif</Text>
              </View>
            </View>
            <View style={styles.legendContainer}>
              <View style={styles.legendColumn}>{legendsLeft.map(renderLegendItem)}</View>
              <View style={styles.legendColumn}>{legendsRight.map(renderLegendItem)}</View>
            </View>
          </View>

          <View style={styles.signatureSection}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureHeader}>SEBELUM PENGIRIMAN BARANG</Text>
              <View style={styles.sigTable}>
                <View style={styles.sigRowHeader}>
                  <Text style={styles.sigCell}>Dibuat Oleh,</Text>
                  <Text style={styles.sigCell}>Diperiksa Oleh,</Text>
                  <Text style={[styles.sigCell, styles.sigCellLast]}>Diterima Oleh,</Text>
                </View>
                <View style={styles.sigRowBody}>
                  <View style={styles.sigCell} />
                  <View style={styles.sigCell} />
                  <View style={[styles.sigCell, styles.sigCellLast]} />
                </View>
                <View style={styles.sigRowFooter}>
                  <Text style={styles.sigCell}>(Adm. Traffic)</Text>
                  <Text style={styles.sigCell}>(Kep. Gudang)</Text>
                  <Text style={[styles.sigCell, styles.sigCellLast]}>(Driver)</Text>
                </View>
              </View>
            </View>

            <View style={styles.signatureBox}>
              <Text style={styles.signatureHeader}>SESUDAH PENGIRIMAN BARANG</Text>
              <View style={styles.sigTable}>
                <View style={styles.sigRowHeader}>
                  <Text style={styles.sigCell}>Diserahkan Oleh,</Text>
                  <Text style={styles.sigCell}>Diterima Oleh,</Text>
                  <Text style={[styles.sigCell, styles.sigCellLast]}>Diperiksa Oleh,</Text>
                </View>
                <View style={styles.sigRowBody}>
                  <View style={styles.sigCell} />
                  <View style={styles.sigCell} />
                  <View style={[styles.sigCell, styles.sigCellLast]} />
                </View>
                <View style={styles.sigRowFooter}>
                  <Text style={styles.sigCell}>(Driver)</Text>
                  <Text style={styles.sigCell}>(Kep. Gudang)</Text>
                  <Text style={[styles.sigCell, styles.sigCellLast]}>(Adm. Traffic)</Text>
                </View>
              </View>
            </View>
          </View>
        </Page>
      ))}
    </Document>
  );
};

export default DeliveryForm;
