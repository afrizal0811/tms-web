// File: src/features/help/PdfDocument.js
import { Document, Image, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

// --- STYLES ---
const styles = StyleSheet.create({
  page: {
    paddingTop: 35,
    paddingBottom: 65,
    paddingHorizontal: 35,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#334155',
    lineHeight: 1.6,
  },
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #0284c7',
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    color: '#0284c7',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  section: {
    marginBottom: 15,
  },
  topicTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 10,
    marginTop: 10,
    backgroundColor: '#f1f5f9',
    padding: 6,
    borderRadius: 4,
  },
  subTopicTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#334155',
    marginTop: 10,
    marginBottom: 6,
    marginLeft: 15,
  },
  contentBlock: {
    marginBottom: 8,
  },
  subContentBlock: {
    marginBottom: 8,
    marginLeft: 15,
  },
  paragraph: {
    marginBottom: 6,
    textAlign: 'justify',
  },
  // List Styles
  listContainer: {
    marginLeft: 10,
    marginBottom: 8,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bulletBox: {
    width: 20,
    alignItems: 'flex-end',
    marginRight: 8,
  },
  bulletText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  listItemContent: {
    flex: 1,
  },

  // --- FONT FIXES ---
  bold: {
    fontFamily: 'Helvetica-Bold',
    color: '#000',
  },
  italic: {
    fontFamily: 'Helvetica-Oblique',
  },
  boldItalic: {
    fontFamily: 'Helvetica-BoldOblique',
  },

  // Image Styles
  imageContainer: {
    marginVertical: 10,
    alignItems: 'center',
  },
  image: {
    width: '100%',
    maxHeight: 300,
    objectFit: 'contain',
    border: '1px solid #e2e8f0',
  },
  imageCaption: {
    fontSize: 8,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'center',
  },

  // Video Box Style (Updated)
  videoBox: {
    padding: 8,
    backgroundColor: '#f1f5f9', // Slate-100
    border: '1px dashed #94a3b8', // Slate-400 dashed
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  videoText: {
    fontFamily: 'Helvetica-Bold', // BOLD
    fontSize: 10,
    color: '#0f172a', // Slate-900
    textAlign: 'center',
  },

  pageNumber: {
    position: 'absolute',
    fontSize: 9,
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#94a3b8',
  },
});

// --- HELPER: RENDER CHILDREN RECURSIVE ---
const renderNodes = (nodes) => {
  return Array.from(nodes).map((child, i) => {
    // 1. Handle Text Node
    if (child.nodeName === '#text') {
      return <Text key={i}>{child.textContent}</Text>;
    }

    // 2. Handle Elements (Bold/Italic)
    const isBold =
      child.nodeName === 'STRONG' ||
      child.nodeName === 'B' ||
      (child.classList && child.classList.contains('font-bold'));
    const isItalic =
      child.nodeName === 'EM' ||
      child.nodeName === 'I' ||
      (child.classList && child.classList.contains('italic'));

    let styleToUse = {};
    if (isBold && isItalic) {
      styleToUse = styles.boldItalic;
    } else if (isBold) {
      styleToUse = styles.bold;
    } else if (isItalic) {
      styleToUse = styles.italic;
    }

    if (child.childNodes && child.childNodes.length > 0) {
      return (
        <Text key={i} style={styleToUse}>
          {renderNodes(child.childNodes)}
        </Text>
      );
    }

    return (
      <Text key={i} style={styleToUse}>
        {child.textContent}
      </Text>
    );
  });
};

// --- HELPER: HTML PARSER ---
const HtmlToPdf = ({ htmlContent }) => {
  if (typeof window === 'undefined') return null;

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const elements = Array.from(doc.body.childNodes);

  return (
    <View>
      {elements.map((el, index) => {
        // --- PARAGRAPH <p> ---
        if (el.nodeName === 'P') {
          return (
            <View key={index} style={styles.paragraph}>
              <Text>{renderNodes(el.childNodes)}</Text>
            </View>
          );
        }

        // --- LISTS <ul> & <ol> ---
        if (el.nodeName === 'UL' || el.nodeName === 'OL') {
          const isOrdered = el.nodeName === 'OL';
          const lis = Array.from(el.children);

          return (
            <View key={index} style={styles.listContainer}>
              {lis.map((li, i) => (
                <View key={i} style={styles.listItem}>
                  {/* Bullet / Number */}
                  <View style={styles.bulletBox}>
                    <Text style={styles.bulletText}>{isOrdered ? `${i + 1}.` : '•'}</Text>
                  </View>

                  {/* List Content */}
                  <View style={styles.listItemContent}>
                    {Array.from(li.childNodes).map((child, ci) => {
                      if (child.nodeName === 'P') {
                        return (
                          <View key={ci} style={{ marginBottom: 2 }}>
                            <Text>{renderNodes(child.childNodes)}</Text>
                          </View>
                        );
                      }
                      if (child.nodeName === '#text' && child.textContent.trim()) {
                        return <Text key={ci}>{child.textContent}</Text>;
                      }
                      return null;
                    })}
                  </View>
                </View>
              ))}
            </View>
          );
        }

        // --- Fallback text biasa ---
        if (el.nodeName === '#text' && el.textContent.trim()) {
          return (
            <Text key={index} style={styles.paragraph}>
              {el.textContent}
            </Text>
          );
        }

        return null;
      })}
    </View>
  );
};

// --- BLOCK RENDERER ---
const BlockRenderer = ({ block }) => {
  if (block.type === 'text') {
    return <HtmlToPdf htmlContent={block.content} />;
  }

  if (block.type === 'image') {
    const imgSrc =
      block.src.startsWith('/') && typeof window !== 'undefined'
        ? `${window.location.origin}${block.src}`
        : block.src;

    return (
      <View style={styles.imageContainer} wrap={false}>
        <Image src={imgSrc} style={styles.image} />
        {block.alt && <Text style={styles.imageCaption}>{block.alt}</Text>}
      </View>
    );
  }

  // --- MODIFIKASI VIDEO BLOCK ---
  if (block.type === 'video') {
    return (
      <View style={styles.videoBox} wrap={false}>
        <Text style={styles.videoText}>Video hanya bisa dilihat di website</Text>
      </View>
    );
  }

  return null;
};

// --- MAIN DOCUMENT ---
export const PdfDocument = ({ category, topics }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header} fixed>
        <Text style={styles.headerTitle}>User Guide: {category}</Text>
      </View>

      {/* Content Loop */}
      {topics.map((topic, index) => (
        <View key={topic.id} style={styles.section}>
          {/* Judul Utama */}
          <Text style={styles.topicTitle}>
            {index + 1}. {topic.title}
          </Text>

          <View style={styles.contentBlock}>
            {topic.blocks?.map((block, i) => (
              <BlockRenderer key={i} block={block} />
            ))}
          </View>

          {/* Sub Topik */}
          {topic.subTopics?.map((sub, subIndex) => (
            <View key={sub.id} style={styles.subContentBlock}>
              <Text style={styles.subTopicTitle}>
                {index + 1}.{subIndex + 1} {sub.title}
              </Text>
              {sub.blocks?.map((block, k) => (
                <BlockRenderer key={k} block={block} />
              ))}
            </View>
          ))}
        </View>
      ))}

      {/* Footer Halaman */}
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        fixed
      />
    </Page>
  </Document>
);
