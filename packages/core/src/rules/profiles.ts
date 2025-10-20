export type RuleConfig = {
  R1_underscoreInText: boolean;
  R2_setGlyphBraces: boolean;
  R3_indicatorBraces: boolean;
  R4_starForms: boolean;
  R5_bigDelimiters: boolean;
  R6_rightDelimiterFixes: boolean;
  R7_splitSuffixMerge: boolean;
};

export type ProfileConfig = RuleConfig & {
  fenceMathAsCode?: boolean;
};

export type ProfileName = 'katex' | 'mathjax' | 'pandoc' | 'github';

export const profiles: Record<ProfileName, ProfileConfig> = {
  katex: {
    R1_underscoreInText: true,
    R2_setGlyphBraces: true,
    R3_indicatorBraces: true,
    R4_starForms: true,
    R5_bigDelimiters: true,
    R6_rightDelimiterFixes: true,
    R7_splitSuffixMerge: true,
  },
  // Alias: mathjax uses the same normalization as katex in our pipeline
  mathjax: {
    R1_underscoreInText: true,
    R2_setGlyphBraces: true,
    R3_indicatorBraces: true,
    R4_starForms: true,
    R5_bigDelimiters: true,
    R6_rightDelimiterFixes: true,
    R7_splitSuffixMerge: true,
  },
  pandoc: {
    R1_underscoreInText: true,
    R2_setGlyphBraces: true,
    R3_indicatorBraces: false,
    R4_starForms: false,
    R5_bigDelimiters: true,
    R6_rightDelimiterFixes: true,
    R7_splitSuffixMerge: false,
  },
  github: {
    R1_underscoreInText: true,
    R2_setGlyphBraces: false,
    R3_indicatorBraces: false,
    R4_starForms: false,
    R5_bigDelimiters: false,
    R6_rightDelimiterFixes: false,
    R7_splitSuffixMerge: false,
    fenceMathAsCode: true,
  },
};
