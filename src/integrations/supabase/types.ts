export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_type: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          doctor_id: string | null
          duration_min: number
          id: string
          notes: string | null
          patient_id: string
          reason: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          appointment_type?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id?: string | null
          duration_min?: number
          id?: string
          notes?: string | null
          patient_id: string
          reason?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          appointment_type?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id?: string | null
          duration_min?: number
          id?: string
          notes?: string | null
          patient_id?: string
          reason?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json
          entity: string
          entity_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          entity: string
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          entity?: string
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      branches: {
        Row: {
          address: string | null
          city: string | null
          code: string
          country: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      claim_status_history: {
        Row: {
          changed_by: string | null
          claim_id: string
          created_at: string
          id: string
          note: string | null
          status: string
        }
        Insert: {
          changed_by?: string | null
          claim_id: string
          created_at?: string
          id?: string
          note?: string | null
          status: string
        }
        Update: {
          changed_by?: string | null
          claim_id?: string
          created_at?: string
          id?: string
          note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_status_history_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "insurance_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          direction: string
          id: string
          lead_id: string | null
          message: string | null
          patient_id: string | null
          status: string
          subject: string | null
        }
        Insert: {
          channel?: string
          created_at?: string
          created_by?: string | null
          direction?: string
          id?: string
          lead_id?: string | null
          message?: string | null
          patient_id?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          direction?: string
          id?: string
          lead_id?: string | null
          message?: string | null
          patient_id?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnosis_catalog: {
        Row: {
          category: string | null
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      diagnostic_orders: {
        Row: {
          created_at: string
          doctor_notes: string | null
          eye: Database["public"]["Enums"]["eye_side"] | null
          findings: string | null
          id: string
          impression: string | null
          ordered_by: string | null
          patient_id: string
          performed_at: string | null
          performed_by: string | null
          priority: string
          report_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          test_id: string | null
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          doctor_notes?: string | null
          eye?: Database["public"]["Enums"]["eye_side"] | null
          findings?: string | null
          id?: string
          impression?: string | null
          ordered_by?: string | null
          patient_id: string
          performed_at?: string | null
          performed_by?: string | null
          priority?: string
          report_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          test_id?: string | null
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          doctor_notes?: string | null
          eye?: Database["public"]["Enums"]["eye_side"] | null
          findings?: string | null
          id?: string
          impression?: string | null
          ordered_by?: string | null
          patient_id?: string
          performed_at?: string | null
          performed_by?: string | null
          priority?: string
          report_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          test_id?: string | null
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_orders_ordered_by_fkey"
            columns: ["ordered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_orders_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_orders_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_orders_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_orders_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_tests: {
        Row: {
          category: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          price: number
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          price?: number
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
        }
        Relationships: []
      }
      equipment: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          last_service_date: string | null
          manufacturer: string | null
          name: string
          next_service_date: string | null
          notes: string | null
          purchase_date: string | null
          serial_no: string | null
          status: string
          updated_at: string
          warranty_until: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          last_service_date?: string | null
          manufacturer?: string | null
          name: string
          next_service_date?: string | null
          notes?: string | null
          purchase_date?: string | null
          serial_no?: string | null
          status?: string
          updated_at?: string
          warranty_until?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          last_service_date?: string | null
          manufacturer?: string | null
          name?: string
          next_service_date?: string | null
          notes?: string | null
          purchase_date?: string | null
          serial_no?: string | null
          status?: string
          updated_at?: string
          warranty_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      examinations: {
        Row: {
          advice: string | null
          anterior_chamber_od: string | null
          anterior_chamber_os: string | null
          cataract_grade_od: string | null
          cataract_grade_os: string | null
          chief_complaint: string | null
          conjunctiva_od: string | null
          conjunctiva_os: string | null
          cornea_od: string | null
          cornea_os: string | null
          created_at: string
          doctor_id: string | null
          fundus_od: string | null
          fundus_os: string | null
          history: string | null
          id: string
          iris_od: string | null
          iris_os: string | null
          lacrimal_od: string | null
          lacrimal_os: string | null
          lashes_od: string | null
          lashes_os: string | null
          lens_od: string | null
          lens_os: string | null
          lids_od: string | null
          lids_os: string | null
          macula_od: string | null
          macula_os: string | null
          optic_disc_od: string | null
          optic_disc_os: string | null
          patient_id: string
          plan: string | null
          pupil_od: string | null
          pupil_os: string | null
          retina_od: string | null
          retina_os: string | null
          sclera_od: string | null
          sclera_os: string | null
          updated_at: string
          vessels_od: string | null
          vessels_os: string | null
          visit_id: string | null
          vitreous_od: string | null
          vitreous_os: string | null
        }
        Insert: {
          advice?: string | null
          anterior_chamber_od?: string | null
          anterior_chamber_os?: string | null
          cataract_grade_od?: string | null
          cataract_grade_os?: string | null
          chief_complaint?: string | null
          conjunctiva_od?: string | null
          conjunctiva_os?: string | null
          cornea_od?: string | null
          cornea_os?: string | null
          created_at?: string
          doctor_id?: string | null
          fundus_od?: string | null
          fundus_os?: string | null
          history?: string | null
          id?: string
          iris_od?: string | null
          iris_os?: string | null
          lacrimal_od?: string | null
          lacrimal_os?: string | null
          lashes_od?: string | null
          lashes_os?: string | null
          lens_od?: string | null
          lens_os?: string | null
          lids_od?: string | null
          lids_os?: string | null
          macula_od?: string | null
          macula_os?: string | null
          optic_disc_od?: string | null
          optic_disc_os?: string | null
          patient_id: string
          plan?: string | null
          pupil_od?: string | null
          pupil_os?: string | null
          retina_od?: string | null
          retina_os?: string | null
          sclera_od?: string | null
          sclera_os?: string | null
          updated_at?: string
          vessels_od?: string | null
          vessels_os?: string | null
          visit_id?: string | null
          vitreous_od?: string | null
          vitreous_os?: string | null
        }
        Update: {
          advice?: string | null
          anterior_chamber_od?: string | null
          anterior_chamber_os?: string | null
          cataract_grade_od?: string | null
          cataract_grade_os?: string | null
          chief_complaint?: string | null
          conjunctiva_od?: string | null
          conjunctiva_os?: string | null
          cornea_od?: string | null
          cornea_os?: string | null
          created_at?: string
          doctor_id?: string | null
          fundus_od?: string | null
          fundus_os?: string | null
          history?: string | null
          id?: string
          iris_od?: string | null
          iris_os?: string | null
          lacrimal_od?: string | null
          lacrimal_os?: string | null
          lashes_od?: string | null
          lashes_os?: string | null
          lens_od?: string | null
          lens_os?: string | null
          lids_od?: string | null
          lids_os?: string | null
          macula_od?: string | null
          macula_os?: string | null
          optic_disc_od?: string | null
          optic_disc_os?: string | null
          patient_id?: string
          plan?: string | null
          pupil_od?: string | null
          pupil_os?: string | null
          retina_od?: string | null
          retina_os?: string | null
          sclera_od?: string | null
          sclera_os?: string | null
          updated_at?: string
          vessels_od?: string | null
          vessels_os?: string | null
          visit_id?: string | null
          vitreous_od?: string | null
          vitreous_os?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "examinations_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "examinations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "examinations_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          branch_id: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          paid_to: string | null
          payment_method: string | null
        }
        Insert: {
          amount: number
          branch_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          paid_to?: string | null
          payment_method?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          paid_to?: string | null
          payment_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          assigned_to: string | null
          created_at: string
          due_date: string
          id: string
          is_done: boolean
          notes: string | null
          patient_id: string
          surgery_id: string | null
          type: string | null
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          due_date: string
          id?: string
          is_done?: boolean
          notes?: string | null
          patient_id: string
          surgery_id?: string | null
          type?: string | null
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          due_date?: string
          id?: string
          is_done?: boolean
          notes?: string | null
          patient_id?: string
          surgery_id?: string | null
          type?: string | null
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_surgery_id_fkey"
            columns: ["surgery_id"]
            isOneToOne: false
            referencedRelation: "surgeries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_claims: {
        Row: {
          approved_amount: number | null
          claim_amount: number
          claim_no: string | null
          created_at: string
          id: string
          invoice_id: string | null
          notes: string | null
          patient_id: string
          policy_no: string | null
          provider: string
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          approved_amount?: number | null
          claim_amount?: number
          claim_no?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          patient_id: string
          policy_no?: string | null
          provider: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          approved_amount?: number | null
          claim_amount?: number
          claim_no?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          patient_id?: string
          policy_no?: string | null
          provider?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_claims_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          batch_id: string | null
          created_at: string
          description: string
          id: string
          invoice_id: string
          item_type: string
          product_id: string | null
          quantity: number
          tax_percent: number
          unit_price: number
        }
        Insert: {
          amount?: number
          batch_id?: string | null
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          item_type?: string
          product_id?: string | null
          quantity?: number
          tax_percent?: number
          unit_price?: number
        }
        Update: {
          amount?: number
          batch_id?: string | null
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          item_type?: string
          product_id?: string | null
          quantity?: number
          tax_percent?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "product_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          discount: number
          id: string
          invoice_no: string
          invoice_type: string
          notes: string | null
          paid_amount: number
          patient_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          subtotal: number
          tax: number
          total: number
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          discount?: number
          id?: string
          invoice_no: string
          invoice_type?: string
          notes?: string | null
          paid_amount?: number
          patient_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          discount?: number
          id?: string
          invoice_no?: string
          invoice_type?: string
          notes?: string | null
          paid_amount?: number
          patient_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      iol_inventory: {
        Row: {
          branch_id: string | null
          created_at: string
          expiry_date: string | null
          id: string
          iol_model_id: string
          is_used: boolean
          power: number | null
          serial_no: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          iol_model_id: string
          is_used?: boolean
          power?: number | null
          serial_no: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          iol_model_id?: string
          is_used?: boolean
          power?: number | null
          serial_no?: string
        }
        Relationships: [
          {
            foreignKeyName: "iol_inventory_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iol_inventory_iol_model_id_fkey"
            columns: ["iol_model_id"]
            isOneToOne: false
            referencedRelation: "iol_models"
            referencedColumns: ["id"]
          },
        ]
      }
      iol_models: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          manufacturer: string | null
          model_code: string | null
          name: string
          price: number | null
          type: string | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          manufacturer?: string | null
          model_code?: string | null
          name: string
          price?: number | null
          type?: string | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          manufacturer?: string | null
          model_code?: string | null
          name?: string
          price?: number | null
          type?: string | null
          unit_cost?: number | null
        }
        Relationships: []
      }
      lead_activities: {
        Row: {
          activity: string
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          next_action_at: string | null
          outcome: string | null
        }
        Insert: {
          activity: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          next_action_at?: string | null
          outcome?: string | null
        }
        Update: {
          activity?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          next_action_at?: string | null
          outcome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          branch_id: string | null
          campaign: string | null
          converted_patient_id: string | null
          created_at: string
          email: string | null
          id: string
          interest: string | null
          name: string
          notes: string | null
          phone: string
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          branch_id?: string | null
          campaign?: string | null
          converted_patient_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          interest?: string | null
          name: string
          notes?: string | null
          phone: string
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          branch_id?: string | null
          campaign?: string | null
          converted_patient_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          interest?: string | null
          name?: string
          notes?: string | null
          phone?: string
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_patient_id_fkey"
            columns: ["converted_patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      optical_orders: {
        Row: {
          branch_id: string | null
          brand: string | null
          coating: string | null
          cost_price: number
          created_at: string
          created_by: string | null
          delivery_date: string | null
          discount: number
          frame_product_id: string | null
          id: string
          invoice_id: string | null
          lens_index: string | null
          lens_product_id: string | null
          notes: string | null
          optical_prescription_id: string | null
          patient_id: string
          quantity: number
          selling_price: number
          status: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          brand?: string | null
          coating?: string | null
          cost_price?: number
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          discount?: number
          frame_product_id?: string | null
          id?: string
          invoice_id?: string | null
          lens_index?: string | null
          lens_product_id?: string | null
          notes?: string | null
          optical_prescription_id?: string | null
          patient_id: string
          quantity?: number
          selling_price?: number
          status?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          brand?: string | null
          coating?: string | null
          cost_price?: number
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          discount?: number
          frame_product_id?: string | null
          id?: string
          invoice_id?: string | null
          lens_index?: string | null
          lens_product_id?: string | null
          notes?: string | null
          optical_prescription_id?: string | null
          patient_id?: string
          quantity?: number
          selling_price?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "optical_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optical_orders_frame_product_id_fkey"
            columns: ["frame_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optical_orders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optical_orders_lens_product_id_fkey"
            columns: ["lens_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optical_orders_optical_prescription_id_fkey"
            columns: ["optical_prescription_id"]
            isOneToOne: false
            referencedRelation: "optical_prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optical_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      optical_prescriptions: {
        Row: {
          add_od: number | null
          add_os: number | null
          axis_od: number | null
          axis_os: number | null
          base_curve: number | null
          coating: string | null
          created_at: string
          cyl_od: number | null
          cyl_os: number | null
          diameter: number | null
          id: string
          lens_type: string | null
          patient_id: string
          pd: number | null
          prescribed_by: string | null
          prism_od: string | null
          prism_os: string | null
          remarks: string | null
          sph_od: number | null
          sph_os: number | null
          type: string
          updated_at: string
          valid_until: string | null
          visit_id: string | null
        }
        Insert: {
          add_od?: number | null
          add_os?: number | null
          axis_od?: number | null
          axis_os?: number | null
          base_curve?: number | null
          coating?: string | null
          created_at?: string
          cyl_od?: number | null
          cyl_os?: number | null
          diameter?: number | null
          id?: string
          lens_type?: string | null
          patient_id: string
          pd?: number | null
          prescribed_by?: string | null
          prism_od?: string | null
          prism_os?: string | null
          remarks?: string | null
          sph_od?: number | null
          sph_os?: number | null
          type?: string
          updated_at?: string
          valid_until?: string | null
          visit_id?: string | null
        }
        Update: {
          add_od?: number | null
          add_os?: number | null
          axis_od?: number | null
          axis_os?: number | null
          base_curve?: number | null
          coating?: string | null
          created_at?: string
          cyl_od?: number | null
          cyl_os?: number | null
          diameter?: number | null
          id?: string
          lens_type?: string | null
          patient_id?: string
          pd?: number | null
          prescribed_by?: string | null
          prism_od?: string | null
          prism_os?: string | null
          remarks?: string | null
          sph_od?: number | null
          sph_os?: number | null
          type?: string
          updated_at?: string
          valid_until?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "optical_prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optical_prescriptions_prescribed_by_fkey"
            columns: ["prescribed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optical_prescriptions_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      optometry_records: {
        Row: {
          add_od: number | null
          add_os: number | null
          aided_va_od: string | null
          aided_va_os: string | null
          auto_ref_od: string | null
          auto_ref_os: string | null
          axis_od: number | null
          axis_os: number | null
          bcva_od: string | null
          bcva_os: string | null
          color_vision: string | null
          contrast_sensitivity: string | null
          created_at: string
          cyl_od: number | null
          cyl_os: number | null
          id: string
          iop_method: string | null
          iop_od: number | null
          iop_os: number | null
          keratometry: string | null
          near_va_od: string | null
          near_va_os: string | null
          notes: string | null
          optometrist_id: string | null
          pachymetry_od: number | null
          pachymetry_os: number | null
          patient_id: string
          pd: number | null
          prism_od: string | null
          prism_os: string | null
          sph_od: number | null
          sph_os: number | null
          ucva_od: string | null
          ucva_os: string | null
          updated_at: string
          visit_id: string | null
          visual_field: string | null
        }
        Insert: {
          add_od?: number | null
          add_os?: number | null
          aided_va_od?: string | null
          aided_va_os?: string | null
          auto_ref_od?: string | null
          auto_ref_os?: string | null
          axis_od?: number | null
          axis_os?: number | null
          bcva_od?: string | null
          bcva_os?: string | null
          color_vision?: string | null
          contrast_sensitivity?: string | null
          created_at?: string
          cyl_od?: number | null
          cyl_os?: number | null
          id?: string
          iop_method?: string | null
          iop_od?: number | null
          iop_os?: number | null
          keratometry?: string | null
          near_va_od?: string | null
          near_va_os?: string | null
          notes?: string | null
          optometrist_id?: string | null
          pachymetry_od?: number | null
          pachymetry_os?: number | null
          patient_id: string
          pd?: number | null
          prism_od?: string | null
          prism_os?: string | null
          sph_od?: number | null
          sph_os?: number | null
          ucva_od?: string | null
          ucva_os?: string | null
          updated_at?: string
          visit_id?: string | null
          visual_field?: string | null
        }
        Update: {
          add_od?: number | null
          add_os?: number | null
          aided_va_od?: string | null
          aided_va_os?: string | null
          auto_ref_od?: string | null
          auto_ref_os?: string | null
          axis_od?: number | null
          axis_os?: number | null
          bcva_od?: string | null
          bcva_os?: string | null
          color_vision?: string | null
          contrast_sensitivity?: string | null
          created_at?: string
          cyl_od?: number | null
          cyl_os?: number | null
          id?: string
          iop_method?: string | null
          iop_od?: number | null
          iop_os?: number | null
          keratometry?: string | null
          near_va_od?: string | null
          near_va_os?: string | null
          notes?: string | null
          optometrist_id?: string | null
          pachymetry_od?: number | null
          pachymetry_os?: number | null
          patient_id?: string
          pd?: number | null
          prism_od?: string | null
          prism_os?: string | null
          sph_od?: number | null
          sph_os?: number | null
          ucva_od?: string | null
          ucva_os?: string | null
          updated_at?: string
          visit_id?: string | null
          visual_field?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "optometry_records_optometrist_id_fkey"
            columns: ["optometrist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optometry_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optometry_records_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      ot_rooms: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ot_rooms_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_diagnoses: {
        Row: {
          created_at: string
          diagnosed_by: string | null
          diagnosis_id: string | null
          diagnosis_text: string | null
          eye: Database["public"]["Enums"]["eye_side"] | null
          id: string
          is_primary: boolean
          notes: string | null
          patient_id: string
          severity: string | null
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          diagnosed_by?: string | null
          diagnosis_id?: string | null
          diagnosis_text?: string | null
          eye?: Database["public"]["Enums"]["eye_side"] | null
          id?: string
          is_primary?: boolean
          notes?: string | null
          patient_id: string
          severity?: string | null
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          diagnosed_by?: string | null
          diagnosis_id?: string | null
          diagnosis_text?: string | null
          eye?: Database["public"]["Enums"]["eye_side"] | null
          id?: string
          is_primary?: boolean
          notes?: string | null
          patient_id?: string
          severity?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_diagnoses_diagnosed_by_fkey"
            columns: ["diagnosed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_diagnoses_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnosis_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_diagnoses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_diagnoses_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_documents: {
        Row: {
          created_at: string
          created_by: string | null
          doc_type: string
          file_url: string | null
          id: string
          notes: string | null
          patient_id: string
          surgery_id: string | null
          title: string
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          doc_type: string
          file_url?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          surgery_id?: string | null
          title: string
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          doc_type?: string
          file_url?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          surgery_id?: string | null
          title?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_surgery_id_fkey"
            columns: ["surgery_id"]
            isOneToOne: false
            referencedRelation: "surgeries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: string | null
          blood_group: string | null
          branch_id: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          gender: Database["public"]["Enums"]["gender_t"] | null
          id: string
          insurance_policy_no: string | null
          insurance_provider: string | null
          is_active: boolean
          last_name: string | null
          medical_history: string | null
          mrn: string
          phone: string
          pincode: string | null
          referred_by: string | null
          state: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          blood_group?: string | null
          branch_id?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          gender?: Database["public"]["Enums"]["gender_t"] | null
          id?: string
          insurance_policy_no?: string | null
          insurance_provider?: string | null
          is_active?: boolean
          last_name?: string | null
          medical_history?: string | null
          mrn: string
          phone: string
          pincode?: string | null
          referred_by?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          allergies?: string | null
          blood_group?: string | null
          branch_id?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          gender?: Database["public"]["Enums"]["gender_t"] | null
          id?: string
          insurance_policy_no?: string | null
          insurance_provider?: string | null
          is_active?: boolean
          last_name?: string | null
          medical_history?: string | null
          mrn?: string
          phone?: string
          pincode?: string | null
          referred_by?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          method: string
          paid_at: string
          received_by: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          method?: string
          paid_at?: string
          received_by?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: string
          paid_at?: string
          received_by?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          created_at: string
          dosage: string | null
          drug_name: string
          duration: string | null
          eye: Database["public"]["Enums"]["eye_side"] | null
          frequency: string | null
          id: string
          instructions: string | null
          prescription_id: string
          route: string | null
          strength: string | null
        }
        Insert: {
          created_at?: string
          dosage?: string | null
          drug_name: string
          duration?: string | null
          eye?: Database["public"]["Enums"]["eye_side"] | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          prescription_id: string
          route?: string | null
          strength?: string | null
        }
        Update: {
          created_at?: string
          dosage?: string | null
          drug_name?: string
          duration?: string | null
          eye?: Database["public"]["Enums"]["eye_side"] | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          prescription_id?: string
          route?: string | null
          strength?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          created_at: string
          doctor_id: string | null
          follow_up_date: string | null
          id: string
          notes: string | null
          patient_id: string
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          doctor_id?: string | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          doctor_id?: string | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      product_batches: {
        Row: {
          batch_no: string
          branch_id: string | null
          cost_price: number
          created_at: string
          expiry_date: string | null
          id: string
          product_id: string
          quantity: number
          selling_price: number
        }
        Insert: {
          batch_no: string
          branch_id?: string | null
          cost_price?: number
          created_at?: string
          expiry_date?: string | null
          id?: string
          product_id: string
          quantity?: number
          selling_price?: number
        }
        Update: {
          batch_no?: string
          branch_id?: string | null
          cost_price?: number
          created_at?: string
          expiry_date?: string | null
          id?: string
          product_id?: string
          quantity?: number
          selling_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_batches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category: Database["public"]["Enums"]["product_category"]
          cost_price: number
          created_at: string
          hsn_code: string | null
          id: string
          is_active: boolean
          metadata: Json
          name: string
          reorder_level: number
          selling_price: number
          sku: string
          stock_qty: number
          tax_percent: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category?: Database["public"]["Enums"]["product_category"]
          cost_price?: number
          created_at?: string
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name: string
          reorder_level?: number
          selling_price?: number
          sku: string
          stock_qty?: number
          tax_percent?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category?: Database["public"]["Enums"]["product_category"]
          cost_price?: number
          created_at?: string
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          reorder_level?: number
          selling_price?: number
          sku?: string
          stock_qty?: number
          tax_percent?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch_id: string | null
          created_at: string
          designation: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          registration_no: string | null
          specialization: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          designation?: string | null
          email?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          phone?: string | null
          registration_no?: string | null
          specialization?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          designation?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          registration_no?: string | null
          specialization?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          purchase_order_id: string
          quantity: number
          received_qty: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          purchase_order_id: string
          quantity?: number
          received_qty?: number
          unit_cost?: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          purchase_order_id?: string
          quantity?: number
          received_qty?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string
          po_number: string
          status: Database["public"]["Enums"]["po_status"]
          supplier_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number: string
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number?: string
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          branch_id: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          branch_id?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          branch_id?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          batch_no: string | null
          branch_id: string | null
          change_qty: number
          created_at: string
          created_by: string | null
          expiry_date: string | null
          id: string
          product_id: string
          reason: string
          reference_id: string | null
        }
        Insert: {
          batch_no?: string | null
          branch_id?: string | null
          change_qty: number
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          product_id: string
          reason?: string
          reference_id?: string | null
        }
        Update: {
          batch_no?: string | null
          branch_id?: string | null
          change_qty?: number
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          product_id?: string
          reason?: string
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          gst_no: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          gst_no?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          gst_no?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      surgeries: {
        Row: {
          anesthesia: string | null
          assistant_id: string | null
          biometry_axial_length: number | null
          biometry_k1: number | null
          biometry_k2: number | null
          branch_id: string | null
          complications: string | null
          consent_signed: boolean
          consumables: string | null
          created_at: string
          duration_min: number
          ended_at: string | null
          estimated_cost: number | null
          eye: Database["public"]["Enums"]["eye_side"]
          id: string
          iol_inventory_id: string | null
          iol_power: number | null
          nurse_id: string | null
          op_notes: string | null
          ot_room_id: string | null
          patient_id: string
          post_op_notes: string | null
          pre_op_notes: string | null
          procedure: string
          scheduled_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["surgery_status"]
          surgeon_id: string | null
          updated_at: string
        }
        Insert: {
          anesthesia?: string | null
          assistant_id?: string | null
          biometry_axial_length?: number | null
          biometry_k1?: number | null
          biometry_k2?: number | null
          branch_id?: string | null
          complications?: string | null
          consent_signed?: boolean
          consumables?: string | null
          created_at?: string
          duration_min?: number
          ended_at?: string | null
          estimated_cost?: number | null
          eye?: Database["public"]["Enums"]["eye_side"]
          id?: string
          iol_inventory_id?: string | null
          iol_power?: number | null
          nurse_id?: string | null
          op_notes?: string | null
          ot_room_id?: string | null
          patient_id: string
          post_op_notes?: string | null
          pre_op_notes?: string | null
          procedure: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["surgery_status"]
          surgeon_id?: string | null
          updated_at?: string
        }
        Update: {
          anesthesia?: string | null
          assistant_id?: string | null
          biometry_axial_length?: number | null
          biometry_k1?: number | null
          biometry_k2?: number | null
          branch_id?: string | null
          complications?: string | null
          consent_signed?: boolean
          consumables?: string | null
          created_at?: string
          duration_min?: number
          ended_at?: string | null
          estimated_cost?: number | null
          eye?: Database["public"]["Enums"]["eye_side"]
          id?: string
          iol_inventory_id?: string | null
          iol_power?: number | null
          nurse_id?: string | null
          op_notes?: string | null
          ot_room_id?: string | null
          patient_id?: string
          post_op_notes?: string | null
          pre_op_notes?: string | null
          procedure?: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["surgery_status"]
          surgeon_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "surgeries_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surgeries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surgeries_iol_inventory_id_fkey"
            columns: ["iol_inventory_id"]
            isOneToOne: false
            referencedRelation: "iol_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surgeries_nurse_id_fkey"
            columns: ["nurse_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surgeries_ot_room_id_fkey"
            columns: ["ot_room_id"]
            isOneToOne: false
            referencedRelation: "ot_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surgeries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surgeries_surgeon_id_fkey"
            columns: ["surgeon_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          appointment_id: string | null
          branch_id: string | null
          called_at: string | null
          checked_in_at: string
          chief_complaint: string | null
          completed_at: string | null
          created_at: string
          department: string | null
          doctor_id: string | null
          id: string
          on_hold: boolean
          patient_id: string
          priority: string
          stage_changed_at: string
          status: Database["public"]["Enums"]["visit_status"]
          token_no: number | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          branch_id?: string | null
          called_at?: string | null
          checked_in_at?: string
          chief_complaint?: string | null
          completed_at?: string | null
          created_at?: string
          department?: string | null
          doctor_id?: string | null
          id?: string
          on_hold?: boolean
          patient_id: string
          priority?: string
          stage_changed_at?: string
          status?: Database["public"]["Enums"]["visit_status"]
          token_no?: number | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          branch_id?: string | null
          called_at?: string | null
          checked_in_at?: string
          chief_complaint?: string | null
          completed_at?: string | null
          created_at?: string
          department?: string | null
          doctor_id?: string | null
          id?: string
          on_hold?: boolean
          patient_id?: string
          priority?: string
          stage_changed_at?: string
          status?: Database["public"]["Enums"]["visit_status"]
          token_no?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      checkin_appointment: {
        Args: { _appointment_id: string }
        Returns: {
          appointment_id: string | null
          branch_id: string | null
          called_at: string | null
          checked_in_at: string
          chief_complaint: string | null
          completed_at: string | null
          created_at: string
          department: string | null
          doctor_id: string | null
          id: string
          on_hold: boolean
          patient_id: string
          priority: string
          stage_changed_at: string
          status: Database["public"]["Enums"]["visit_status"]
          token_no: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "visits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_walk_in_visit: {
        Args: {
          _branch_id?: string
          _chief_complaint?: string
          _doctor_id?: string
          _patient_id: string
          _priority?: string
        }
        Returns: {
          appointment_id: string | null
          branch_id: string | null
          called_at: string | null
          checked_in_at: string
          chief_complaint: string | null
          completed_at: string | null
          created_at: string
          department: string | null
          doctor_id: string | null
          id: string
          on_hold: boolean
          patient_id: string
          priority: string
          stage_changed_at: string
          status: Database["public"]["Enums"]["visit_status"]
          token_no: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "visits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_clinical: { Args: { _user_id: string }; Returns: boolean }
      is_finance: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      next_invoice_no: { Args: never; Returns: string }
      next_mrn: { Args: never; Returns: string }
      next_po_no: { Args: never; Returns: string }
      owns_patient: { Args: { _patient_id: string }; Returns: boolean }
      recalc_invoice: { Args: { _invoice_id: string }; Returns: undefined }
      same_branch: { Args: { _branch: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "clinic_admin"
        | "receptionist"
        | "doctor"
        | "optometrist"
        | "nurse"
        | "pharmacist"
        | "optical_staff"
        | "inventory_manager"
        | "accountant"
        | "diagnostic_staff"
        | "crm_staff"
        | "patient"
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "checked_in"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
      eye_side: "OD" | "OS" | "OU"
      gender_t: "male" | "female" | "other"
      lead_status: "new" | "contacted" | "qualified" | "converted" | "lost"
      order_status:
        | "ordered"
        | "sample_collected"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "reviewed"
      payment_status: "unpaid" | "partial" | "paid" | "refunded"
      po_status:
        | "draft"
        | "sent"
        | "partially_received"
        | "received"
        | "cancelled"
      product_category:
        | "medicine"
        | "frame"
        | "lens"
        | "contact_lens"
        | "iol"
        | "consumable"
        | "equipment_part"
        | "other"
      surgery_status:
        | "planned"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "postponed"
        | "cancelled"
      visit_status:
        | "waiting"
        | "optometry"
        | "with_doctor"
        | "diagnostics"
        | "billing"
        | "completed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "clinic_admin",
        "receptionist",
        "doctor",
        "optometrist",
        "nurse",
        "pharmacist",
        "optical_staff",
        "inventory_manager",
        "accountant",
        "diagnostic_staff",
        "crm_staff",
        "patient",
      ],
      appointment_status: [
        "scheduled",
        "confirmed",
        "checked_in",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      eye_side: ["OD", "OS", "OU"],
      gender_t: ["male", "female", "other"],
      lead_status: ["new", "contacted", "qualified", "converted", "lost"],
      order_status: [
        "ordered",
        "sample_collected",
        "in_progress",
        "completed",
        "cancelled",
        "reviewed",
      ],
      payment_status: ["unpaid", "partial", "paid", "refunded"],
      po_status: [
        "draft",
        "sent",
        "partially_received",
        "received",
        "cancelled",
      ],
      product_category: [
        "medicine",
        "frame",
        "lens",
        "contact_lens",
        "iol",
        "consumable",
        "equipment_part",
        "other",
      ],
      surgery_status: [
        "planned",
        "scheduled",
        "in_progress",
        "completed",
        "postponed",
        "cancelled",
      ],
      visit_status: [
        "waiting",
        "optometry",
        "with_doctor",
        "diagnostics",
        "billing",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
