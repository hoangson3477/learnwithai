type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!['vi', 'en'].includes(locale)) {
    return children;
  }
  return children;
}
