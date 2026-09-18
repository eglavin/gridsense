import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listAppSettings } from "@/features/app-settings/actions";
import { OptionsForm } from "@/features/app-settings/components/options-form";
import { getDataCounts } from "@/features/danger-zone/actions";
import { DangerZone } from "@/features/danger-zone/components/danger-zone";
import { listIngestionLog } from "@/features/data-import/actions";
import { UploadForm } from "@/features/data-import/components/upload-form";
import { listTariffRates } from "@/features/tariffs/actions";
import { TariffCsvControls } from "@/features/tariffs/components/tariff-csv-controls";
import { TariffForm } from "@/features/tariffs/components/tariff-form";
import { TariffHistoryChart } from "@/features/tariffs/components/tariff-history-chart";
import { getMonthlyTariffHistory } from "@/features/tariffs/queries";
import { listWeatherStatus } from "@/features/weather/actions";
import { WeatherBackfill } from "@/features/weather/components/weather-backfill";
import { WeatherLocationPicker } from "@/features/weather/components/weather-location-picker";
import { formatNumber } from "@/lib/format";

import { SettingsTabs } from "./settings-tabs";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({
	searchParams,
}: {
	searchParams: Promise<{ tab?: string }>;
}) {
	const [{ tab }, ingestionRows, tariffRows, dataCounts, appSettings, weatherStatus] =
		await Promise.all([
			searchParams,
			listIngestionLog(),
			listTariffRates(),
			getDataCounts(),
			listAppSettings(),
			listWeatherStatus(),
		]);

	const tariffHistory = getMonthlyTariffHistory();

	const validTabs = ["import", "weather", "tariff", "options", "danger-zone"];
	const currentTab = validTabs.includes(tab ?? "") ? tab! : "import";

	return (
		<div className="flex flex-col gap-4">
			<div>
				<h1 className="text-2xl font-semibold">Settings</h1>
				<p className="text-muted-foreground text-sm">Upload new exports and manage tariff rates.</p>
			</div>

			<SettingsTabs tab={currentTab}>
				<TabsList>
					<TabsTrigger value="import">Data Import</TabsTrigger>
					<TabsTrigger value="weather">Weather</TabsTrigger>
					<TabsTrigger value="tariff">Tariff Rates</TabsTrigger>
					<TabsTrigger value="options">Options</TabsTrigger>
					<TabsTrigger value="danger-zone">Danger Zone</TabsTrigger>
				</TabsList>

				<TabsContent value="import" className="flex flex-col gap-4">
					<Card>
						<CardHeader>
							<CardTitle>Upload exports</CardTitle>
						</CardHeader>
						<CardContent>
							<UploadForm />
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Import history</CardTitle>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>File</TableHead>
										<TableHead>Type</TableHead>
										<TableHead>Rows</TableHead>
										<TableHead>New / Updated</TableHead>
										<TableHead>Date range</TableHead>
										<TableHead>Uploaded</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{ingestionRows.length === 0 && (
										<TableRow>
											<TableCell colSpan={6} className="text-muted-foreground">
												No files uploaded yet.
											</TableCell>
										</TableRow>
									)}
									{ingestionRows.map((row) => (
										<TableRow key={row.id}>
											<TableCell className="font-mono text-xs">{row.fileName}</TableCell>
											<TableCell>
												<Badge variant="secondary">
													{row.sourceType === "car_charger"
														? "Car charger"
														: row.sourceType === "esb"
															? "ESB grid"
															: "Solar"}
												</Badge>
											</TableCell>
											<TableCell className="font-mono tabular-nums">
												{formatNumber(row.rowsParsed)}
											</TableCell>
											<TableCell className="font-mono tabular-nums">
												{formatNumber(row.rowsInserted)} / {formatNumber(row.rowsUpdated)}
											</TableCell>
											<TableCell className="font-mono tabular-nums">
												{row.dateRangeStart} → {row.dateRangeEnd}
											</TableCell>
											<TableCell className="font-mono tabular-nums">{row.uploadedAt}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="weather" className="flex flex-col gap-4">
					<Card>
						<CardHeader>
							<CardTitle>Weather</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							<WeatherLocationPicker
								latitude={appSettings.weatherLatitude}
								longitude={appSettings.weatherLongitude}
							/>
							<Separator />
							<WeatherBackfill status={weatherStatus} />
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="tariff" className="flex flex-col gap-4">
					<div className="flex justify-end">
						<TariffCsvControls />
					</div>

					{tariffHistory.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle>Tariff rate history</CardTitle>
							</CardHeader>
							<CardContent>
								<TariffHistoryChart data={tariffHistory} />
							</CardContent>
						</Card>
					)}

					<div className="grid grid-cols-1 grid-rows-2 gap-4 lg:grid-cols-2 lg:grid-rows-1">
						<Card>
							<CardHeader>
								<CardTitle>Import rate</CardTitle>
							</CardHeader>
							<CardContent>
								<TariffForm
									direction="import"
									rates={tariffRows.filter((r) => r.direction === "import")}
								/>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Export rate</CardTitle>
							</CardHeader>
							<CardContent>
								<TariffForm
									direction="export"
									rates={tariffRows.filter((r) => r.direction === "export")}
								/>
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="options">
					<Card>
						<CardHeader>
							<CardTitle>Data source options</CardTitle>
						</CardHeader>
						<CardContent>
							<OptionsForm settings={appSettings} />
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="danger-zone">
					<Card>
						<CardHeader>
							<CardTitle>Danger zone</CardTitle>
						</CardHeader>
						<CardContent>
							<DangerZone counts={dataCounts} />
						</CardContent>
					</Card>
				</TabsContent>
			</SettingsTabs>
		</div>
	);
}
