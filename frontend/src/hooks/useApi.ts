import { useState } from 'react';
import type { AnalysisResponse, SecurityContext } from '../types';
export const useApi = () => {
  const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [data, setData] = useState<AnalysisResponse | null>(null);

	const analyzeInfrastructure = async (
		planFile: File,
		context: SecurityContext
	): Promise<AnalysisResponse | null> => {
		setLoading(true);
		setError(null);

		
		const formData = new FormData();
		formData.append('plan', planFile);
		
		
		formData.append('meta', JSON.stringify(context));

		try {
			
			const response = await fetch('/api/v1/analyze', {
				method: 'POST',
				body: formData,
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Backend pipeline execution failure (${response.status}): ${errorText}`);
			}

			const result: AnalysisResponse = await response.json();
			setData(result);
			return result;
		} catch (err: any) {
			const fallbackMsg = err.message || 'An unexpected failure occurred while mapping threat records.';
			setError(fallbackMsg);
			return null;
		} finally {
			setLoading(false);
		}
	};

	const resetApiState = () => {
		setData(null);
		setError(null);
		setLoading(false);
	};

	return {
		analyzeInfrastructure,
		loading,
		error,
		data,
		resetApiState,
	};
};