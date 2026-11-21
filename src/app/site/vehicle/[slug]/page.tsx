import { AssetPage, assetMetadata } from '@/components/site/AssetPage';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  return assetMetadata('vehicle', (await params).slug);
}

export default async function VehiclePage({ params }: Props) {
  return <AssetPage category="vehicle" slug={(await params).slug} />;
}
