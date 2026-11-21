import { AssetPage, assetMetadata } from '@/components/site/AssetPage';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  return assetMetadata('property', (await params).slug);
}

export default async function PropertyPage({ params }: Props) {
  return <AssetPage category="property" slug={(await params).slug} />;
}
