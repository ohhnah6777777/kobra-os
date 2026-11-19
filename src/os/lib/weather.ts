import { useQuery } from "@tanstack/react-query";
import { Sun, Cloud, CloudSun, CloudFog, CloudRain, CloudSnow, CloudLightning } from "lucide-react";
import { useOS } from "../store";
export type WeatherData = { current: { temp: number; feels: number; humidity: number; wind: number; code: number }; hourly: { time: string; temp: number; rain: number; code: number }[]; daily: { date: string; max: number; min: number; rain: number; humidity: number; code: number }[] };
export type City = { id: number; name: string; latitude: number; longitude: number; country?: string; admin1?: string };
export async function searchCity(q: string, signal?: AbortSignal): Promise<City[]> {
  if (q.trim().length < 2) return [];
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=6`, signal ? { signal } : {});
  if (!response.ok) throw new Error("City search is unavailable. Please try again.");
  const result = await response.json(); return result.results ?? [];
}
export async function fetchWeather(lat: number, lon: number, signal?: AbortSignal): Promise<WeatherData> {
  const params = new URLSearchParams({ latitude: String(lat), longitude: String(lon), current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation", hourly: "temperature_2m,precipitation_probability,weather_code", daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,relative_humidity_2m_mean", timezone: "auto", forecast_days: "7" });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, signal ? { signal } : {});
  if (!response.ok) throw new Error("Weather is unavailable. Please try again shortly.");
  const r = await response.json();
  if (!r.current || !r.hourly || !r.daily) throw new Error("Incomplete weather response.");
  return { current: { temp: r.current.temperature_2m, feels: r.current.apparent_temperature, humidity: r.current.relative_humidity_2m, wind: r.current.wind_speed_10m, code: r.current.weather_code }, hourly: r.hourly.time.map((time: string, i: number) => ({ time, temp: r.hourly.temperature_2m[i], rain: r.hourly.precipitation_probability[i], code: r.hourly.weather_code[i] })).filter((h: {time: string}) => h.time >= r.current.time.slice(0, 13) + ":00").slice(0, 24), daily: r.daily.time.map((date: string, i: number) => ({ date, max: r.daily.temperature_2m_max[i], min: r.daily.temperature_2m_min[i], rain: r.daily.precipitation_probability_max[i], humidity: r.daily.relative_humidity_2m_mean[i], code: r.daily.weather_code[i] })) };
}
export function describeCode(code: number) {
  if (code === 0) return { label: "Clear sky", icon: Sun };
  if (code <= 2) return { label: "Partly cloudy", icon: CloudSun };
  if (code === 3) return { label: "Overcast", icon: Cloud };
  if (code <= 48) return { label: "Foggy", icon: CloudFog };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: "Snow", icon: CloudSnow };
  if (code >= 95) return { label: "Thunderstorms", icon: CloudLightning };
  return { label: "Rain", icon: CloudRain };
}
export function useWeather(): { data?: WeatherData; isLoading: boolean; error: unknown } {
  const city = useOS(s => s.settings.weatherCity);
  const query = useQuery({ queryKey: ["weather", city.lat, city.lon], queryFn: ({ signal }) => fetchWeather(city.lat, city.lon, signal), staleTime: 15 * 60_000, refetchInterval: 15 * 60_000 });
  return { ...(query.data ? { data: query.data } : {}), isLoading: query.isLoading, error: query.error };
}
