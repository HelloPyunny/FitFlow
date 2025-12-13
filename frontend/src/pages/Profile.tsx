import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { getUserProfile, createUserProfile, updateUserProfile } from '../lib/api';

interface ProfileFormData {
  height: string;
  weight: string;
  sex: string;
  age: string;
  unitSystem: 'metric' | 'imperial';
  experienceLevel: string;
  primaryGoal: string;
  weeklyFrequency: number;
}

interface FormErrors {
  height?: string;
  weight?: string;
  age?: string;
  weeklyFrequency?: string;
}

function Profile() {
  const { user, isLoaded } = useUser();
  
  // Convert Clerk user ID to a consistent integer for backend compatibility
  const getUserId = (): number => {
    if (!user?.id) return 1;
    let hash = 0;
    for (let i = 0; i < user.id.length; i++) {
      const char = user.id.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };
  
  const userId = user ? getUserId() : 1;
  
  const [formData, setFormData] = useState<ProfileFormData>({
    height: '',
    weight: '',
    sex: '',
    age: '',
    unitSystem: 'metric',
    experienceLevel: '',
    primaryGoal: '',
    weeklyFrequency: 1,
  });

  const [originalData, setOriginalData] = useState<ProfileFormData | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    if (isLoaded && user) {
      loadProfile();
    }
  }, [isLoaded, user]);

  const loadProfile = async () => {
    if (!isLoaded || !user) return;
    
    setIsLoadingProfile(true);
    try {
      const response = await getUserProfile(userId);
      const profile = response.data;
      
      // Convert metric values back to user's preferred unit system
      const height = profile.unit_system === 'metric' 
        ? profile.height 
        : profile.height / 2.54;
      const weight = profile.unit_system === 'metric'
        ? profile.weight
        : profile.weight / 0.453592;
      
      const data: ProfileFormData = {
        height: height.toString(),
        weight: weight.toString(),
        sex: profile.sex,
        age: profile.age.toString(),
        unitSystem: profile.unit_system,
        experienceLevel: profile.experience_level,
        primaryGoal: profile.primary_goal,
        weeklyFrequency: profile.weekly_frequency,
      };
      
      setFormData(data);
      setOriginalData(data);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Failed to load profile:', error);
      }
      // 404 means no profile exists yet, which is fine
      // Keep form empty for new users
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Height validation (100-250 cm or 39-98 inches)
    const heightNum = parseFloat(formData.height);
    if (!formData.height || isNaN(heightNum) || heightNum <= 0) {
      newErrors.height = 'Height is required';
    } else if (formData.unitSystem === 'metric') {
      if (heightNum < 100 || heightNum > 250) {
        newErrors.height = 'Height must be between 100-250 cm';
      }
    } else {
      const heightCm = heightNum * 2.54;
      if (heightCm < 100 || heightCm > 250) {
        newErrors.height = 'Height must be between 39-98 inches';
      }
    }

    // Weight validation (30-250 kg or 66-551 lb)
    const weightNum = parseFloat(formData.weight);
    if (!formData.weight || isNaN(weightNum) || weightNum <= 0) {
      newErrors.weight = 'Weight is required';
    } else if (formData.unitSystem === 'metric') {
      if (weightNum < 30 || weightNum > 250) {
        newErrors.weight = 'Weight must be between 30-250 kg';
      }
    } else {
      const weightKg = weightNum * 0.453592;
      if (weightKg < 30 || weightKg > 250) {
        newErrors.weight = 'Weight must be between 66-551 lb';
      }
    }

    // Age validation
    if (formData.age) {
      const ageNum = parseInt(formData.age);
      if (isNaN(ageNum) || ageNum < 10 || ageNum > 100) {
        newErrors.age = 'Age must be between 10-100 years';
      }
    }

    // Weekly frequency validation
    if (formData.weeklyFrequency < 1 || formData.weeklyFrequency > 7) {
      newErrors.weeklyFrequency = 'Weekly frequency must be between 1-7';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const hasChanges = () => {
    if (!originalData) return true;
    return JSON.stringify(formData) !== JSON.stringify(originalData);
  };

  const convertToMetric = (value: number, type: 'height' | 'weight'): number => {
    if (formData.unitSystem === 'metric') return value;
    if (type === 'height') return value * 2.54; // inches to cm
    return value * 0.453592; // lb to kg
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setSaveMessage('');

    try {
      const heightCm = convertToMetric(parseFloat(formData.height), 'height');
      const weightKg = convertToMetric(parseFloat(formData.weight), 'weight');
      const ageNum = parseInt(formData.age);

      const profileData = {
        user_id: userId,
        height: heightCm,
        weight: weightKg,
        sex: formData.sex as 'male' | 'female' | 'prefer_not_to_say',
        age: ageNum,
        unit_system: formData.unitSystem,
        experience_level: formData.experienceLevel as 'beginner' | 'intermediate' | 'advanced',
        primary_goal: formData.primaryGoal as 'bulk' | 'cut' | 'lean_mass' | 'weight_loss',
        weekly_frequency: formData.weeklyFrequency,
      };

      if (originalData) {
        // Update existing profile
        await updateUserProfile(userId, profileData);
      } else {
        // Create new profile
        await createUserProfile(profileData);
      }

      setSaveMessage('Saved');
      setOriginalData({ ...formData });
      
      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save profile:', error);
      setSaveMessage('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof ProfileFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isLoaded || !user) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Please sign in to view your profile.</p>
        </div>
      </div>
    );
  }

  if (isLoadingProfile) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">User Profile</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 pb-24 sm:pb-6">
        {/* Account Information Section */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <div className="mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">Account Information</h3>
            <p className="text-xs sm:text-sm text-gray-500">
              Your account details from Clerk.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <div className="mt-1 text-sm text-gray-900">
                {user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user.firstName || user.lastName || 'Not set'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="mt-1 text-sm text-gray-900">
                {user.primaryEmailAddress?.emailAddress || 'Not set'}
              </div>
            </div>
          </div>
        </div>

        {/* Basic Profile Section */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <div className="mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">Basic Profile</h3>
            <p className="text-xs sm:text-sm text-gray-500">
              This helps generate better workout recommendations.
            </p>
          </div>

          <div className="space-y-4">
            {/* Unit System Toggle */}
            <div className="flex items-center justify-end mb-4">
              <div className="flex rounded-md shadow-sm" role="group">
                <button
                  type="button"
                  onClick={() => handleInputChange('unitSystem', 'metric')}
                  className={`px-3 py-2 text-xs sm:text-sm font-medium border ${
                    formData.unitSystem === 'metric'
                      ? 'bg-indigo-600 text-white border-indigo-600 z-10'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  } rounded-l-md`}
                >
                  Metric (cm, kg)
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange('unitSystem', 'imperial')}
                  className={`px-3 py-2 text-xs sm:text-sm font-medium border ${
                    formData.unitSystem === 'imperial'
                      ? 'bg-indigo-600 text-white border-indigo-600 z-10'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  } rounded-r-md border-l-0`}
                >
                  Imperial (in, lb)
                </button>
              </div>
            </div>

            {/* Height */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Height <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step={formData.unitSystem === 'metric' ? '1' : '0.1'}
                  value={formData.height}
                  onChange={(e) => handleInputChange('height', e.target.value)}
                  placeholder={formData.unitSystem === 'metric' ? '175' : '69'}
                  className={`w-full px-3 py-2.5 sm:py-3 text-sm sm:text-base border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.height ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-gray-500">
                  {formData.unitSystem === 'metric' ? 'cm' : 'in'}
                </span>
              </div>
              {errors.height && (
                <p className="mt-1 text-xs text-red-600">{errors.height}</p>
              )}
            </div>

            {/* Weight */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Weight <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                  placeholder={formData.unitSystem === 'metric' ? '70.5' : '155'}
                  className={`w-full px-3 py-2.5 sm:py-3 text-sm sm:text-base border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.weight ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-gray-500">
                  {formData.unitSystem === 'metric' ? 'kg' : 'lb'}
                </span>
              </div>
              {errors.weight && (
                <p className="mt-1 text-xs text-red-600">{errors.weight}</p>
              )}
            </div>

            {/* Sex */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Sex <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.sex}
                onChange={(e) => handleInputChange('sex', e.target.value)}
                className="w-full px-3 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>

            {/* Age */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Age <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="1"
                value={formData.age}
                onChange={(e) => handleInputChange('age', e.target.value)}
                placeholder="25"
                className={`w-full px-3 py-2.5 sm:py-3 text-sm sm:text-base border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.age ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.age && (
                <p className="mt-1 text-xs text-red-600">{errors.age}</p>
              )}
            </div>
          </div>
        </div>

        {/* Training Background Section */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <div className="mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">Training Background</h3>
            <p className="text-xs sm:text-sm text-gray-500">
              This helps generate better workout recommendations.
            </p>
          </div>

          <div className="space-y-4">
            {/* Experience Level */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Experience level <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.experienceLevel}
                onChange={(e) => handleInputChange('experienceLevel', e.target.value)}
                className="w-full px-3 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Primary Goal */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Primary goal <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.primaryGoal}
                onChange={(e) => handleInputChange('primaryGoal', e.target.value)}
                className="w-full px-3 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select</option>
                <option value="bulk">Bulk</option>
                <option value="cut">Cut</option>
                <option value="lean_mass">Lean Mass</option>
                <option value="weight_loss">Weight Loss</option>
              </select>
            </div>

            {/* Weekly Frequency */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Weekly frequency <span className="text-red-500">*</span>
              </label>
              <div className="flex rounded-md shadow-sm" role="group">
                {[1, 2, 3, 4, 5, 6, 7].map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => handleInputChange('weeklyFrequency', freq)}
                    className={`flex-1 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border ${
                      formData.weeklyFrequency === freq
                        ? 'bg-indigo-600 text-white border-indigo-600 z-10'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    } ${
                      freq === 1
                        ? 'rounded-l-md border-r-0'
                        : freq === 7
                        ? 'rounded-r-md border-l-0'
                        : 'border-l-0 border-r-0'
                    } focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:z-10`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
              {errors.weeklyFrequency && (
                <p className="mt-1 text-xs text-red-600">{errors.weeklyFrequency}</p>
              )}
            </div>
          </div>
        </div>

        {/* Save Button - Sticky on mobile */}
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg sm:shadow-none py-3 sm:py-0 sm:border-0 sm:bg-transparent sm:static z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-0">
            {saveMessage && (
              <div className={`mb-3 text-center text-sm font-medium ${
                saveMessage === 'Saved' ? 'text-green-600' : 'text-red-600'
              }`}>
                {saveMessage}
              </div>
            )}
            <button
              type="submit"
              disabled={!hasChanges() || isSaving || !formData.sex || !formData.experienceLevel || !formData.primaryGoal}
              className="w-full bg-indigo-600 text-white py-3 sm:py-2.5 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-lg font-semibold transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default Profile;
