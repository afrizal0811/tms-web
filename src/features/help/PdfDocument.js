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
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: '#0284c7',
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

  // LEVEL 1 (Main Topic)
  topicTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
    marginTop: 10,
    backgroundColor: '#f1f5f9',
    padding: 6,
    borderRadius: 4,
  },
  contentBlock: {
    marginBottom: 8,
  },

  // LEVEL 2 (Sub Topic)
  subTopicTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#334155',
    marginTop: 8,
    marginBottom: 4,
    marginLeft: 15,
  },
  subContentBlock: {
    marginBottom: 6,
    marginLeft: 15,
  },

  // LEVEL 3 (Sub-Sub Topic)
  subSubTopicTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 6,
    marginBottom: 2,
    marginLeft: 30,
  },
  subSubContentBlock: {
    marginBottom: 4,
    marginLeft: 30,
  },

  paragraph: {
    marginBottom: 6,
    textAlign: 'justify',
    lineHeight: 0.9,
  },

  // List Styles
  listContainer: {
    marginLeft: 14,
    marginBottom: 4,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 1,
  },
  bulletBox: {
    width: 18,
    alignItems: 'flex-end',
    marginRight: 6,
  },
  bulletText: {
    fontSize: 10,
    fontWeight: 'bold',
    // Opsional: lineHeight untuk bullet
    lineHeight: 2,
  },
  listItemContent: {
    flex: 1,
  },

  // Font Styles
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
  link: {
    color: '#2563eb',
    textDecoration: 'underline',
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
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#e2e8f0',
  },
  imageCaption: {
    fontSize: 8,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'center',
  },

  // Video Box Style
  videoBox: {
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#94a3b8',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  videoText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#0f172a',
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

// --- 1. HELPER: RENDER INLINE ---
const renderInlineNodes = (nodes) => {
  return Array.from(nodes).map((child, i) => {
    if (child.nodeName === '#text') {
      return <Text key={i}>{child.textContent}</Text>;
    }

    let className = '';
    if (child.getAttribute) className = child.getAttribute('class') || '';

    const isBold =
      child.nodeName === 'STRONG' || child.nodeName === 'B' || className.includes('font-bold');
    const isItalic =
      child.nodeName === 'EM' || child.nodeName === 'I' || className.includes('italic');
    const isLink = child.nodeName === 'A';

    let styleToUse = {};
    if (isBold && isItalic) styleToUse = styles.boldItalic;
    else if (isBold) styleToUse = styles.bold;
    else if (isItalic) styleToUse = styles.italic;

    if (isLink) {
      const href = child.getAttribute('href');
      return (
        <Link key={i} src={href} style={[styles.link, styleToUse]}>
          {renderInlineNodes(child.childNodes)}
        </Link>
      );
    }

    if (child.childNodes && child.childNodes.length > 0) {
      return (
        <Text key={i} style={styleToUse}>
          {renderInlineNodes(child.childNodes)}
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

// --- 2. HELPER: RENDER BLOCK ---
const renderBlockNodes = (elements, isInsideList = false) => {
  return elements.map((el, index) => {
    // --- PARAGRAPH <p> ---
    if (el.nodeName === 'P') {
      let className = '';
      if (el.getAttribute) className = el.getAttribute('class') || '';
      const isBold = className.includes('font-bold');

      const blockStyle = isInsideList ? { ...styles.paragraph, marginBottom: 0 } : styles.paragraph;

      return (
        <View key={index} style={blockStyle}>
          <Text style={isBold ? styles.bold : {}}>{renderInlineNodes(el.childNodes)}</Text>
        </View>
      );
    }

    // --- LISTS <ul> & <ol> ---
    if (el.nodeName === 'UL' || el.nodeName === 'OL') {
      let className = '';
      if (el.getAttribute) className = el.getAttribute('class') || '';
      if (!className && el.className && typeof el.className === 'string') className = el.className;

      const isOrdered = el.nodeName === 'OL' || className.includes('list-decimal');
      const lis = Array.from(el.children);

      const containerStyle = isInsideList
        ? { ...styles.listContainer, marginBottom: 0, marginTop: 0 }
        : styles.listContainer;

      return (
        <View key={index} style={containerStyle}>
          {lis.map((li, i) => (
            <View key={i} style={styles.listItem}>
              <View style={styles.bulletBox}>
                <Text style={styles.bulletText}>{isOrdered ? `${i + 1}.` : '•'}</Text>
              </View>

              <View style={styles.listItemContent}>
                {renderBlockNodes(Array.from(li.childNodes), true)}
              </View>
            </View>
          ))}
        </View>
      );
    }

    // --- IMAGES (DIV Wrapper dengan Custom Width) ---
    if (el.nodeName === 'DIV') {
      const img = el.querySelector('img');
      if (img) {
        const imgSrc = img.getAttribute('src');
        const imgAlt = img.getAttribute('alt') || 'Image';
        const finalSrc =
          imgSrc.startsWith('/') && typeof window !== 'undefined'
            ? `${window.location.origin}${imgSrc}`
            : imgSrc;

        // FITUR WIDTH: Ambil width dari style DIV pembungkus
        let customWidth = null;
        const divStyle = el.getAttribute('style');
        if (divStyle) {
          const widthMatch = divStyle.match(/width:\s*([^;]+)/i);
          if (widthMatch) {
            customWidth = widthMatch[1].trim();
          }
        }

        return (
          <View key={index} style={styles.imageContainer} wrap={false}>
            <Image
              src={finalSrc}
              style={[styles.image, customWidth ? { width: customWidth } : {}]}
              alt={imgAlt}
            />
          </View>
        );
      }
      return <View key={index}>{renderBlockNodes(Array.from(el.childNodes), isInsideList)}</View>;
    }

    // --- IMAGES (Direct IMG) ---
    if (el.nodeName === 'IMG') {
      const imgSrc = el.getAttribute('src');
      const imgAlt = el.getAttribute('alt') || 'Image';
      const finalSrc =
        imgSrc.startsWith('/') && typeof window !== 'undefined'
          ? `${window.location.origin}${imgSrc}`
          : imgSrc;

      return (
        <View key={index} style={styles.imageContainer} wrap={false}>
          <Image src={finalSrc} style={styles.image} alt={imgAlt} />
        </View>
      );
    }

    // --- VIDEOS (Direct IFRAME) ---
    if (el.nodeName === 'IFRAME') {
      return (
        <View key={index} style={styles.videoBox} wrap={false}>
          <Text style={styles.videoText}>Video hanya bisa dilihat di website</Text>
        </View>
      );
    }

    // --- Fallback text ---
    if (el.nodeName === '#text' && el.textContent.trim()) {
      const blockStyle = isInsideList ? { ...styles.paragraph, marginBottom: 0 } : styles.paragraph;

      return (
        <Text key={index} style={blockStyle}>
          {el.textContent}
        </Text>
      );
    }

    return null;
  });
};

// --- 3. HTML PARSER WRAPPER ---
const HtmlToPdf = ({ htmlContent }) => {
  if (typeof window === 'undefined') return null;

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const elements = Array.from(doc.body.childNodes);

  return <View>{renderBlockNodes(elements)}</View>;
};

// --- 4. MAIN BLOCK RENDERER ---
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
        <Image src={imgSrc} style={styles.image} alt={block.alt || 'Tutorial Image'} />
        {block.alt && <Text style={styles.imageCaption}>{block.alt}</Text>}
      </View>
    );
  }

  if (block.type === 'video') {
    return (
      <View style={styles.videoBox} wrap={false}>
        <Text style={styles.videoText}>Video hanya bisa dilihat di website</Text>
      </View>
    );
  }

  return null;
};

// --- 5. MAIN DOCUMENT COMPONENT ---
export const PdfDocument = ({ category, topics }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header} fixed>
        <Text style={styles.headerTitle}>User Guide: {category}</Text>
      </View>

      {/* Content Loop Level 1 */}
      {topics.map((topic, index) => {
        const mainNumber = `${index + 1}.`;

        return (
          <View key={topic.id} style={styles.section}>
            <Text style={styles.topicTitle}>
              {mainNumber} {topic.title}
            </Text>

            <View style={styles.contentBlock}>
              {topic.blocks?.map((block, i) => (
                <BlockRenderer key={i} block={block} />
              ))}
            </View>

            {/* Content Loop Level 2 */}
            {topic.subTopics?.map((sub, subIndex) => {
              const subNumber = `${mainNumber}${subIndex + 1}.`;

              return (
                <View key={sub.id} style={styles.subContentBlock}>
                  <Text style={styles.subTopicTitle}>
                    {subNumber} {sub.title}
                  </Text>

                  {sub.blocks?.map((block, k) => (
                    <BlockRenderer key={k} block={block} />
                  ))}

                  {/* Content Loop Level 3 */}
                  {sub.subSubTopics?.map((subSub, subSubIndex) => {
                    const subSubNumber = `${subNumber}${subSubIndex + 1}.`;

                    return (
                      <View key={subSub.id} style={styles.subSubContentBlock}>
                        <Text style={styles.subSubTopicTitle}>
                          {subSubNumber} {subSub.title}
                        </Text>

                        {subSub.blocks?.map((block, m) => (
                          <BlockRenderer key={m} block={block} />
                        ))}
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        );
      })}

      {/* Footer */}
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        fixed
      />
    </Page>
  </Document>
);
