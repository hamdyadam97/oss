import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

import { Layout } from "@/components/Layout";
import { Loading } from "@/components/ui";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";

const About = lazy(() => import("@/pages/About"));
const Programs = lazy(() => import("@/pages/Programs"));
const ProgramDetail = lazy(() => import("@/pages/ProgramDetail"));
const ServicesList = lazy(() => import("@/pages/Services").then((m) => ({ default: m.ServicesList })));
const ServiceApply = lazy(() => import("@/pages/Services").then((m) => ({ default: m.ServiceApply })));
const Track = lazy(() => import("@/pages/Track"));
const Volunteer = lazy(() => import("@/pages/Volunteer"));
const MediaList = lazy(() => import("@/pages/Media").then((m) => ({ default: m.MediaList })));
const PostDetail = lazy(() => import("@/pages/Media").then((m) => ({ default: m.PostDetail })));
const GalleryList = lazy(() => import("@/pages/Media").then((m) => ({ default: m.GalleryList })));
const AlbumDetail = lazy(() => import("@/pages/Media").then((m) => ({ default: m.AlbumDetail })));
const Governance = lazy(() => import("@/pages/Governance"));
const Impact = lazy(() => import("@/pages/Impact"));
const Partners = lazy(() => import("@/pages/Partners"));
const FaqPage = lazy(() => import("@/pages/Misc").then((m) => ({ default: m.FaqPage })));
const Contact = lazy(() => import("@/pages/Misc").then((m) => ({ default: m.Contact })));
const CmsPage = lazy(() => import("@/pages/Misc").then((m) => ({ default: m.CmsPage })));
const SearchPage = lazy(() => import("@/pages/Misc").then((m) => ({ default: m.SearchPage })));
const CoursesList = lazy(() => import("@/pages/Courses").then((m) => ({ default: m.CoursesList })));
const CourseDetail = lazy(() => import("@/pages/Courses").then((m) => ({ default: m.CourseDetail })));
const Membership = lazy(() => import("@/pages/Membership"));
const CertificateLookup = lazy(() => import("@/pages/Certificate").then((m) => ({ default: m.CertificateLookup })));
const CertificateView = lazy(() => import("@/pages/Certificate").then((m) => ({ default: m.CertificateView })));
// The dashboard is a separate bundle that public visitors never download.
const AdminApp = lazy(() => import("@/admin/AdminApp"));

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="programs" element={<Programs />} />
          <Route path="programs/:slug" element={<ProgramDetail />} />
          <Route path="services" element={<ServicesList />} />
          <Route path="services/:slug" element={<ServiceApply />} />
          <Route path="track" element={<Track />} />
          <Route path="courses" element={<CoursesList />} />
          <Route path="courses/:slug" element={<CourseDetail />} />
          <Route path="membership" element={<Membership />} />
          <Route path="certificates" element={<CertificateLookup />} />
          <Route path="certificates/:code" element={<CertificateView />} />
          <Route path="volunteer" element={<Volunteer />} />
          <Route path="media" element={<MediaList />} />
          <Route path="media/:slug" element={<PostDetail />} />
          <Route path="gallery" element={<GalleryList />} />
          <Route path="gallery/:slug" element={<AlbumDetail />} />
          <Route path="governance" element={<Governance />} />
          <Route path="impact" element={<Impact />} />
          <Route path="partners" element={<Partners />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="contact" element={<Contact />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="p/:slug" element={<CmsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
