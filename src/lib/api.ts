import type { Food, JourneyDetail, MacroTarget, RecommendedTargets, RecentFood, NutritionDayResponse, TargetField, TargetsPayload } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('fitlog_access_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('fitlog_access_token', token);
      } else {
        localStorage.removeItem('fitlog_access_token');
      }
    }
  }

  setRefreshToken(token: string | null) {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('fitlog_refresh_token', token);
      } else {
        localStorage.removeItem('fitlog_refresh_token');
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  logout() {
    this.setToken(null);
    this.setRefreshToken(null);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorBody = {};
      try {
        errorBody = await res.json();
      } catch (e) {
        // Not JSON
      }

      if (res.status === 401 && typeof window !== 'undefined') {
        this.logout();
        if (window.location.pathname.startsWith('/app')) {
          window.location.href = '/login';
        }
      }

      const error = new Error(`API Error: ${res.status} ${res.statusText}`);
      (error as any).response = errorBody;
      (error as any).status = res.status;
      throw error;
    }

    if (res.status === 204) {
      return {} as T;
    }

    return res.json();
  }

  // Auth
  async login(email: string, password: string) {
    const data = await this.request<{ access: string; refresh: string }>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access);
    this.setRefreshToken(data.refresh);
    return data;
  }

  async register(payload: { email: string; password: string; first_name: string; last_name: string }) {
    const data = await this.request<{ user: any; tokens: { access: string; refresh: string } }>('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(data.tokens.access);
    this.setRefreshToken(data.tokens.refresh);
    return data;
  }

  async getMe() {
    return this.request<any>('/auth/me/');
  }

  async updateMe(payload: {
    first_name?: string;
    last_name?: string;
    avatar_url?: string | null;
    profile?: {
      date_of_birth?: string | null;
      height_cm?: number | null;
      weight_kg?: number | null;
      sex?: string;
      activity_level?: string;
      fitness_goal?: string;
      unit_preference?: string;
      bio?: string;
    };
  }) {
    return this.request<any>('/auth/me/', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async changePassword(old_password: string, new_password: string) {
    return this.request<{ detail: string }>('/auth/change-password/', {
      method: 'POST',
      body: JSON.stringify({ old_password, new_password }),
    });
  }

  // Gyms & Memberships
  async getGyms() {
    return this.request<any>('/gyms/');
  }

  async getMembers(gymId?: string) {
    const query = gymId ? `?gym_id=${gymId}` : '';
    return this.request<any>(`/memberships/${query}`);
  }

  async getTrainerClients(gymId?: string) {
    const query = gymId ? `?gym_id=${gymId}` : '';
    return this.request<any>(`/trainer-clients/${query}`);
  }

  async getInvitations(gymId: string) {
    return this.request<any>(`/invitations/?gym_id=${gymId}`);
  }

  async createInvitation(gymId: string, email: string, role: string) {
    return this.request<any>('/invitations/', {
      method: 'POST',
      body: JSON.stringify({ gym: gymId, email, role }),
    });
  }

  // Exercises
  async getExercises(params?: { muscle?: string; equipment?: string; search?: string; gym_id?: string }) {
    const query = new URLSearchParams();
    if (params?.muscle) query.append('muscle', params.muscle);
    if (params?.equipment) query.append('equipment', params.equipment);
    if (params?.search) query.append('search', params.search);
    if (params?.gym_id) query.append('gym_id', params.gym_id);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<any>(`/exercises/${queryString}`);
  }

  async getMuscleGroups() {
    return this.request<any>('/muscle-groups/');
  }

  async getEquipmentTypes() {
    return this.request<any>('/equipment-types/');
  }

  // Workouts
  async getWorkouts(clientId?: string) {
    const query = clientId ? `?client_id=${clientId}` : '';
    return this.request<any>(`/workouts/sessions/${query}`);
  }

  async getTodaysWorkout() {
    return this.request<any>('/workouts/sessions/today/');
  }

  async getWorkoutPlan() {
    return this.request<any>('/workouts/sessions/plan/');
  }

  async getCardio() {
    return this.request<any>('/workouts/cardio/');
  }

  async logCardio(payload: { date: string; modality: string; duration_minutes: number; intensity?: string; heart_rate?: number }) {
    return this.request<any>('/workouts/cardio/', { method: 'POST', body: JSON.stringify(payload) });
  }

  async createWorkoutSession(sessionData: any) {
    return this.request<any>('/workouts/sessions/', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  }

  async getRoutines() {
    return this.request<any>('/workouts/routines/');
  }

  async createRoutine(routineData: any) {
    return this.request<any>('/workouts/routines/', {
      method: 'POST',
      body: JSON.stringify(routineData),
    });
  }

  async getAssignedWorkouts() {
    return this.request<any>('/assigned-workouts/');
  }

  async assignWorkout(payload: { gym: string; client: string; routine: string; scheduled_date: string }) {
    return this.request<any>('/assigned-workouts/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async postTrainerFeedback(assignedId: string, feedback: string) {
    return this.request<any>(`/assigned-workouts/${assignedId}/feedback/`, {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    });
  }

  // Nutrition
  async getNutrition(dateStr: string = 'today') {
    return this.request<NutritionDayResponse>(`/nutrition/${dateStr}/`);
  }

  // Pass `food` + `servings` or `quantity` to have the server compute macros; otherwise send them explicitly.
  async addMeal(mealData: { meal_type: string; name?: string; food?: string; servings?: number; quantity?: number; calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number; date?: string }) {
    return this.request<any>('/nutrition/meals/', {
      method: 'POST',
      body: JSON.stringify(mealData),
    });
  }

  async deleteMeal(mealId: string) {
    return this.request<any>(`/nutrition/meals/${mealId}/`, {
      method: 'DELETE',
    });
  }

  async getRecentFoods() {
    return this.request<RecentFood[]>('/nutrition/recent-foods/');
  }

  async repeatYesterdayMeal(mealType?: string, date?: string) {
    return this.request<{ copied_count: number; meals: any[]; day: any }>('/nutrition/repeat-yesterday/', {
      method: 'POST',
      body: JSON.stringify({ meal_type: mealType, date }),
    });
  }

  async searchFoods(search: string = '') {
    return this.request<Food[]>(`/nutrition/foods/?search=${encodeURIComponent(search)}`);
  }

  async createFood(food: { name: string; serving_label: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }) {
    return this.request<Food>('/nutrition/foods/', {
      method: 'POST',
      body: JSON.stringify(food),
    });
  }

  async getTargets() {
    return this.request<TargetsPayload>('/nutrition/macro-targets/');
  }

  /** Partial edit. With dryRun the server returns the rebalanced result and warnings without saving. */
  async updateTargets(changes: Partial<Record<TargetField, number | null>>, dryRun = false) {
    return this.request<TargetsPayload>('/nutrition/macro-targets/', {
      method: 'PUT',
      body: JSON.stringify({ ...changes, dry_run: dryRun }),
    });
  }

  async getRecommendedTargets() {
    return this.request<RecommendedTargets>('/nutrition/macro-targets/recommended/');
  }

  async applyRecommendedTargets() {
    return this.request<MacroTarget>('/nutrition/macro-targets/recommended/', { method: 'POST' });
  }

  async updateWater(dateStr: string, waterMl: number) {
    return this.request<any>(`/nutrition/${dateStr}/`, {
      method: 'PATCH',
      body: JSON.stringify({ water_consumed_ml: waterMl }),
    });
  }

  // Progress
  async getWeights(clientId?: string) {
    const query = clientId ? `?client_id=${clientId}` : '';
    return this.request<any>(`/progress/weight/${query}`);
  }

  async logWeight(weight_kg: number, body_fat_pct?: number, notes?: string) {
    const today = new Date().toISOString().split('T')[0];
    return this.request<any>('/progress/weight/', {
      method: 'POST',
      body: JSON.stringify({ date: today, weight_kg, body_fat_pct, notes: notes || '' }),
    });
  }

  async getMeasurements(clientId?: string) {
    const query = clientId ? `?client_id=${clientId}` : '';
    return this.request<any>(`/progress/measurements/${query}`);
  }

  async logMeasurement(data: Record<string, any>) {
    return this.request<any>('/progress/measurements/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMeasurement(id: string, data: Record<string, any>) {
    return this.request<any>(`/progress/measurements/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteMeasurement(id: string) {
    return this.request<any>(`/progress/measurements/${id}/`, {
      method: 'DELETE',
    });
  }

  async getPersonalRecords(clientId?: string) {
    const query = clientId ? `?client_id=${clientId}` : '';
    return this.request<any>(`/progress/prs/${query}`);
  }

  // Daily Lifestyle, Steps & Sleep Log
  async getDailyLogs(clientId?: string) {
    const query = clientId ? `?client_id=${clientId}` : '';
    return this.request<any>(`/progress/daily/${query}`);
  }

  async getDailyLogForDate(dateStr: string) {
    const data = await this.request<any[]>(`/progress/daily/?date=${dateStr}`);
    return data && data.length > 0 ? data[0] : null;
  }

  async logDaily(data: {
    date?: string;
    steps?: number | null;
    sleep_hours?: number | null;
    sleep_quality?: number | null;
    energy_level?: number | null;
    recovery_notes?: string;
  }) {
    const today = new Date().toISOString().split('T')[0];
    return this.request<any>('/progress/daily/', {
      method: 'POST',
      body: JSON.stringify({
        date: data.date || today,
        steps: data.steps != null ? Number(data.steps) : null,
        sleep_hours: data.sleep_hours != null ? Number(data.sleep_hours) : null,
        sleep_quality: data.sleep_quality != null ? Number(data.sleep_quality) : null,
        energy_level: data.energy_level != null ? Number(data.energy_level) : null,
        recovery_notes: data.recovery_notes || '',
      }),
    });
  }


  // Notifications
  async getNotifications() {
    return this.request<any>('/notifications/');
  }

  async markNotificationRead(id: string) {
    return this.request<any>(`/notifications/${id}/read/`, {
      method: 'PATCH',
    });
  }

  // Audit Logs
  async getAuditLogs(gymId: string) {
    return this.request<any>(`/audit-logs/?gym_id=${gymId}`);
  }

  // Analytics & Journey
  async getDashboardStats() {
    return this.request<any>('/analytics/dashboard/');
  }

  async getJourneyPacingStatus() {
    return this.request<any>('/analytics/journey-status/');
  }

  async getJourneyHistory() {
    return this.request<any>('/workouts/sessions/journey-history/');
  }

  async getJourneyDetail(id: string) {
    return this.request<JourneyDetail>(`/workouts/sessions/journey/${id}/`);
  }

  async startJourney(payload: {
    mode: string;
    /** Send either duration_days or end_date (YYYY-MM-DD); plan day 1 is today. */
    duration_days?: number;
    end_date?: string;
    start_weight_kg?: number | null;
    target_weight_kg?: number | null;
    name?: string;
    blueprint?: string;
    focus_exercise_id?: string | null;
    target_focus_1rm?: number | null;
  }) {
    return this.request<any>('/workouts/sessions/start-journey/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const api = new ApiClient();

